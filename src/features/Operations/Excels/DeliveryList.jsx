// src/pages/DeliveryList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCargoShipment,getCargoById } from "../../../services/cargoService";
import { getPartyByIdFlexible, findPartyIdByName } from "../../../services/partyService";
import * as XLSX from "xlsx";

/** ================= DEBUG ================= */

const DEBUG = false;

const log  = (...a) => DEBUG && console.log("[DeliveryList]", ...a);
const info = (...a) => DEBUG && console.info("[DeliveryList]", ...a);
const warn = (...a) => DEBUG && console.warn("[DeliveryList]", ...a);

const errL = (...a) => DEBUG && console.error("[DeliveryList]", ...a);

/** ================= helpers ================= */
const truthy = (v) => !(v == null || (typeof v === "string" && v.trim() === ""));
const fmt = (v) => (v === 0 || v ? String(v) : "—");

/** Unwrap cargo from several possible shapes */
const unwrapCargo = (raw) => {
  const d = raw?.data ?? raw;
  if (!d) return null;
  if (d.success && d.cargo) return d.cargo;
  if (d.cargo) return d.cargo;
  if (d.data && d.data.cargo) return d.data.cargo;
  if (d.data && typeof d.data === "object" && !Array.isArray(d.data)) return d.data;
  if (typeof d === "object" && !Array.isArray(d)) return d;
  return null;
};

/** Items / pieces / weight (supports items[] or grouped boxes) */
const extractItems = (c = {}) => {
  if (Array.isArray(c?.items)) return c.items;
  if (c?.boxes && typeof c.boxes === "object") {
    try {
      return Object.values(c.boxes).flatMap((b) =>
        Array.isArray(b?.items) ? b.items : []
      );
    } catch {
      return [];
    }
  }
  return [];
};
const sumPieces = (items = []) =>
  items.reduce((s, it) => s + Number(it?.piece_no ?? it?.pieces ?? it?.qty ?? 0), 0);
const sumWeight = (items = []) =>
  items.reduce((s, it) => s + Number(it?.weight ?? it?.weight_kg ?? 0), 0);

/** Receiver/Consignee address & state with lots of fallbacks */
const consigneeAddress = (c = {}, party = null) => {
  const parts = [
    // Prefer party address if present
    party?.address ?? [party?.address_line1, party?.address_line2].filter(truthy).join(", "),
    party?.city ?? party?.district,
    party?.state,
    party?.country,
    party?.postal_code ?? party?.pincode,

    // Fallback from cargo fields
    c.receiver_address ?? c.consignee_address,
    c.receiver_city ?? c.consignee_city,
    c.receiver_district ?? c.consignee_district,
    c.receiver_state ?? c.consignee_state,
    c.receiver_country ?? c.consignee_country,
    c.receiver_postal_code ?? c.receiver_pincode ?? c.consignee_pincode,
  ].filter(truthy);

  return parts
    .join(", ")
    .replace(/\r?\n+/g, ", ")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/,\s*$/g, "")
    .trim();
};

const consigneeState = (c = {}, party = null) =>
  party?.state ??
  c.receiver_state ??
  c.consignee_state ??
  "";

/** If boxes exist, list their keys; else fall back to booking_no */
const boxNumberDisplay = (c = {}) => {
  if (c?.boxes && typeof c.boxes === "object") {
    const keys = Object.keys(c.boxes).sort((a, b) => Number(a) - Number(b));
    if (keys.length) return keys.join(", ");
  }
  return c?.booking_no ?? c?.bookingNo ?? "—";
};

/** IDs must come from the cargo detail */
const getSenderId = (c = {}) =>
  c?.sender_id ?? c?.senderId ?? c?.sender_party_id ?? c?.senderPartyId ?? c?.shipper_id ?? c?.shipperId ?? null;
const getReceiverId = (c = {}) =>
  c?.receiver_id ?? c?.receiverId ?? c?.receiver_party_id ?? c?.receiverPartyId ?? c?.consignee_id ?? c?.consigneeId ?? null;

/** ================ Component ================ */
export default function DeliveryList() {
  const { id } = useParams(); // shipment id
  const navigate = useNavigate();

  const [cargoIds, setCargoIds] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [partyMap, setPartyMap] = useState({});     // partyId -> party
  const [partyLoading, setPartyLoading] = useState(false);

  /** 1) Shipment -> cargo IDs */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await getCargoShipment(id);
        const d = res?.data ?? res;
        const ship =
          Array.isArray(d?.data) ? d.data[0] :
          (d?.data && !Array.isArray(d?.data) ? d.data : d);

        const ids = Array.isArray(ship?.cargos)
          ? ship.cargos.map((r) => Number(r?.id)).filter((n) => Number.isFinite(n))
          : [];

        info("Shipment fetched", { shipment_id: id, cargo_ids: ids });
        if (!alive) return;
        setCargoIds(ids);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load shipment");
        errL("Shipment fetch failed", e);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  /** 2) For each cargo id, fetch detail (resolve missing IDs by name) */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cargoIds.length) { setCargos([]); return; }
      setLoading(true);
      try {
        // limit concurrency to avoid hammering API (batching)
        const batches = [];
        const BATCH = 6;
        for (let i = 0; i < cargoIds.length; i += BATCH) {
          batches.push(cargoIds.slice(i, i + BATCH));
        }

        const collected = [];
        for (const group of batches) {
          /* eslint-disable no-await-in-loop */
          const groupResults = await Promise.all(
            group.map(async (cid) => {
              try {
                const res = await getCargoById(cid);
                const cargo = unwrapCargo(res);
                if (!cargo) { warn("Cargo detail empty", { cid }); return { id: cid }; }

                let sId = getSenderId(cargo);
                let rId = getReceiverId(cargo);

                // Resolve by name if needed
                if (!truthy(sId) && truthy(cargo?.sender_name ?? cargo?.shipper_name)) {
                  const name = cargo?.sender_name ?? cargo?.shipper_name;
                  sId = await findPartyIdByName(name, "sender");
                  info("Sender ID resolved by name", { cargo_id: cid, name, sId });
                }
                if (!truthy(rId) && truthy(cargo?.receiver_name ?? cargo?.consignee_name)) {
                  const name = cargo?.receiver_name ?? cargo?.consignee_name;
                  rId = await findPartyIdByName(name, "receiver");
                  info("Receiver ID resolved by name", { cargo_id: cid, name, rId });
                }

                return { ...cargo, sender_id: sId ?? null, receiver_id: rId ?? null };
              } catch (e) {
                if (e?.response?.status === 404) { warn("Cargo not found (404)", { cid }); return null; }
                warn("getCargoById failed", cid, e?.message);
                return null;
              }
            })
          );
          collected.push(...groupResults.filter(Boolean));
          /* eslint-enable no-await-in-loop */
        }

        if (!alive) return;
        setCargos(collected);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cargoIds]);

  /** 3) Fetch parties for cargos */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cargos.length) { setPartyMap({}); return; }

      const need = new Set();
      for (const c of cargos) {
        const s = getSenderId(c);
        const r = getReceiverId(c);

        if (!truthy(s) || !truthy(r)) {
          warn("Cargo missing party IDs; backend data may be incomplete", {
            cargo_id: c?.id, s, r,
            sender_name: c?.sender_name ?? c?.shipper_name ?? null,
            receiver_name: c?.receiver_name ?? c?.consignee_name ?? null,
          });
        }
        if (truthy(s) && !partyMap[String(s)]) need.add(String(s));
        if (truthy(r) && !partyMap[String(r)]) need.add(String(r));
      }

      if (need.size === 0) return;

      setPartyLoading(true);
      try {
        const ids = Array.from(need);
        const BATCH = 8;
        const fetchedEntries = [];

        for (let i = 0; i < ids.length; i += BATCH) {
          /* eslint-disable no-await-in-loop */
          const slice = ids.slice(i, i + BATCH);
          const entries = await Promise.all(
            slice.map(async (pid) => {
              try {
                const party = await getPartyByIdFlexible(Number(pid));
                info("Party fetched via /party/:id", { party_id: pid, ok: !!party });
                return [pid, party ?? null];
              } catch (e) {
                warn("getPartyByIdFlexible failed", pid, e?.message);
                return [pid, null];
              }
            })
          );
          fetchedEntries.push(...entries);
          /* eslint-enable no-await-in-loop */
        }

        if (!alive) return;
        setPartyMap((prev) => {
          const next = { ...prev };
          fetchedEntries.forEach(([pid, p]) => { if (p) next[pid] = p; });
          return next;
        });
      } finally {
        if (alive) setPartyLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargos]);

  const rows = useMemo(() => (Array.isArray(cargos) ? cargos : []), [cargos]);
  const receiverPartyFor = (cargo) => {
    const id = getReceiverId(cargo);
    return truthy(id) ? partyMap[String(id)] ?? null : null;
  };

  /** ===== Excel export ===== */
  const buildExportRow = (c, idx) => {
    const items = extractItems(c);
    const pieces = sumPieces(items);

    const weightRaw = Number(c?.total_weight);
    const weight = Number.isFinite(weightRaw) ? weightRaw : sumWeight(items);
    const weightDisplay = Number.isFinite(weight) ? Math.trunc(weight) : "";

    const rParty = receiverPartyFor(c);
    const address = consigneeAddress(c, rParty);
    const state = consigneeState(c, rParty);
    const boxNo = boxNumberDisplay(c);

    return {
      "Sl No": idx + 1,
      "Booking Number": c?.booking_no ?? c?.id ?? "",
      "No. of Piece": pieces || 0,
      "Weight (kg)": weightDisplay,
      "Consignee Address": address || "",
      "State": state || "",
      "Box Number": boxNo || "",
    };
  };

  const handleExportExcel = () => {
    try {
      const data = rows.map((c, idx) => buildExportRow(c, idx));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Delivery List");
      XLSX.writeFile(wb, `shipment_${id}_delivery_list.xlsx`);
      info("Excel exported", { rows: data.length });
    } catch (e) {
      errL("Excel export failed", e);
      alert("Export failed. Check console for details.");
    }
  };

  /** ===== UI ===== */
  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Delivery List</h1>
            <p className="mt-1 text-sm text-slate-600">
              Shipment ID: <span className="font-mono">{id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={handleExportExcel}
              className="rounded-lg border border-green-300 bg-green-600 px-3 py-1.5 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || rows.length === 0}
              title={rows.length ? "Download Excel" : "No rows to export"}
            >
              Export Excel
            </button>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">
              Rows: <span className="font-semibold">{rows.length}</span>
            </span>
            {partyLoading && (
              <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1">
                Loading parties…
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[1000px] w-full text-sm [&_td]:align-top [&_th]:align-top">
            <colgroup>
              <col className="w-[70px]" />
              <col className="w-[160px]" />
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col className="w-[440px]" />
              <col className="w-[180px]" />
              <col className="w-[240px]" />
            </colgroup>

            <thead className="bg-slate-50">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3">Sl No</th>
                <th className="px-4 py-3">Booking Number</th>
                <th className="px-4 py-3 text-right">No. of Piece</th>
                <th className="px-4 py-3 text-right">Weight (kg)</th>
                <th className="px-4 py-3">Consignee Address</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Box Number</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : err ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-rose-700">
                    {err}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-600">
                    No cargos found for this shipment.
                  </td>
                </tr>
              ) : (
                rows.map((c, idx) => {
                  const items = extractItems(c);
                  const pieces = sumPieces(items);

                  const weightRaw = Number(c?.total_weight);
                  const weight = Number.isFinite(weightRaw) ? weightRaw : sumWeight(items);
                  const weightDisplay = Number.isFinite(weight) ? String(Math.trunc(weight)) : "—";

                  const rParty = receiverPartyFor(c);

                  const address = consigneeAddress(c, rParty);
                  const state = consigneeState(c, rParty);
                  const boxNo = boxNumberDisplay(c);

                  return (
                    <tr
                      key={c.id ?? `${idx}-${c?.booking_no ?? ""}`}
                      className={idx % 2 ? "bg-white" : "bg-slate-50/30 hover:bg-slate-50"}
                    >
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono">{fmt(c?.booking_no ?? c?.id)}</td>
                      <td className="px-4 py-3 text-right">{fmt(pieces)}</td>
                      <td className="px-4 py-3 text-right">{fmt(weightDisplay)}</td>
                      <td className="px-4 py-3">
                        {partyLoading && truthy(getReceiverId(c)) && !rParty ? "Loading…" : fmt(address)}
                      </td>
                      <td className="px-4 py-3">
                        {partyLoading && truthy(getReceiverId(c)) && !rParty ? "Loading…" : fmt(state)}
                      </td>
                      <td className="px-4 py-3">{fmt(c?.booking_no ?? c?.id)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-black"
          >
            Back
          </button>
        </div>
      </div>
    </section>
  );
}
