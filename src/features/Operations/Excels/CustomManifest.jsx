// src/pages/All Excels/CustomManifest.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCargoShipment,getCargoById } from "../../../services/cargoService";
import { getPartyByIdFlexible, findPartyIdByName } from "../../../services/partyService";
import * as XLSX from "xlsx";

/* ================= DEBUG ================= */

const DEBUG = false;

const info = (...a) => DEBUG && console.info("[Manifest]", ...a);
const warn = (...a) => DEBUG && console.warn("[Manifest]", ...a);
const errL = (...a) => DEBUG && console.error("[Manifest]", ...a);

/* ================= utils ================= */
const truthy = (v) => !(v == null || (typeof v === "string" && v.trim() === ""));
const fmt = (v) => (v === 0 || v ? String(v) : "—");
const money = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : "—");

// normalize a “role+name” key for caching
const normKey = (role, name) =>
  `${role}:${String(name || "").toLowerCase().replace(/\s+/g, " ").trim()}`;

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

const extractItems = (c = {}) => {
  if (Array.isArray(c?.items)) return c.items;
  if (c?.boxes && typeof c.boxes === "object") {
    try {
      return Object.values(c.boxes).flatMap((b) => Array.isArray(b?.items) ? b.items : []);
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
const descOfGoods = (items = []) =>
  items
    .map((it) => `${it?.name ?? it?.item_name ?? "Item"} (${it?.piece_no ?? it?.pieces ?? it?.qty ?? 0})`)
    .join(", ");

const cleanJoin = (arr) =>
  arr
    .filter(truthy)
    .join(", ")
    .replace(/\r?\n+/g, ", ")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/,\s*$/g, "")
    .trim();

const addressFromParty = (p) => {
  if (!p) return "";
  const line = [p.address, p.address_line1, p.address_line2].filter(truthy).join(", ");
  return cleanJoin([line, p.city ?? p.district, p.state, p.country, p.postal_code ?? p.pincode]);
};
const addressFromCargo = (pfx, c = {}) =>
  cleanJoin([
    c?.[`${pfx}_address`],
    c?.[`${pfx}_city`],
    c?.[`${pfx}_district`],
    c?.[`${pfx}_state`],
    c?.[`${pfx}_country`],
    c?.[`${pfx}_postal_code`] ?? c?.[`${pfx}_pincode`],
  ]);

// Unified phone extractor: works with either a prefix+cargo or a party object
const phonesOf = (pOrPrefix, maybeCargo) => {
  // Prefix mode: ("sender" | "receiver", cargoObj)
  if (typeof pOrPrefix === "string") {
    const pfx = pOrPrefix;
    const o = maybeCargo ?? {};
    const nums = [
      o[`${pfx}_contact_number`],
      o[`${pfx}_phone`],
      o[`${pfx}_mobile`],
      o?.contact_number,
      o?.phone,
      o?.mobile,
    ].filter(truthy);
    const wa = o[`${pfx}_whatsapp_number`] ?? o?.whatsapp_number;
    return { phones: Array.from(new Set(nums)), whatsapp: truthy(wa) ? String(wa) : "" };
  }
  // Party mode: (partyObj)
  const p = pOrPrefix ?? {};
  const nums = [p.contact_number, p.phone, p.mobile, p.mobile_number].filter(truthy);
  const wa = p.whatsapp_number ?? p.whatsapp ?? p.whats_app;
  return { phones: Array.from(new Set(nums)), whatsapp: truthy(wa) ? String(wa) : "" };
};

// IDs must come from the cargo detail (shipment list can be incomplete)
const getSenderId = (c = {}) =>
  c?.sender_id ?? c?.senderId ?? c?.sender_party_id ?? c?.senderPartyId ?? c?.shipper_id ?? c?.shipperId ?? null;
const getReceiverId = (c = {}) =>
  c?.receiver_id ?? c?.receiverId ?? c?.receiver_party_id ?? c?.receiverPartyId ?? c?.consignee_id ?? c?.consigneeId ?? null;

// Weight: display **without decimals** (integer kg)
const intKg = (w) => {
  const n = Number(w);
  if (!Number.isFinite(n)) return fmt(w);
  return String(Math.trunc(n));
};

/* ================= component ================= */
export default function ShipmentManifest() {
  const { id } = useParams(); // shipment id
  const navigate = useNavigate();

  const [cargoIds, setCargoIds] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [partyMap, setPartyMap] = useState({}); // partyId -> party
  const [partyLoading, setPartyLoading] = useState(false);

  // caches to avoid duplicate lookups
  const nameToIdRef = useRef(new Map()); // key = normKey(role, name) -> id|null
  const inflightPartyRef = useRef(new Set()); // ids in-flight

  /* 1) Shipment -> cargo IDs */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
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
    return () => {
      alive = false;
    };
  }, [id]);

  /* 2) For each cargo id, fetch detail + try resolve missing sender/receiver IDs by name */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cargoIds.length) {
        setCargos([]);
        return;
      }
      setLoading(true);
      try {
        const detailed = await Promise.all(
          cargoIds.map(async (cid) => {
            try {
              const res = await getCargoById(cid);
              const cargo = unwrapCargo(res);
              if (!cargo) {
                warn("Cargo detail empty", { cid });
                return { id: cid };
              }

              let sId = getSenderId(cargo);
              let rId = getReceiverId(cargo);
              info("Cargo detail", { cargo_id: cid, sender_id: sId ?? null, receiver_id: rId ?? null });

              // Resolve by name if missing
              if (!truthy(sId) && truthy(cargo?.sender_name ?? cargo?.shipper_name)) {
                const name = cargo.sender_name ?? cargo.shipper_name;
                const cacheKey = normKey("sender", name);
                if (!nameToIdRef.current.has(cacheKey)) {
                  try {
                    const pid = await findPartyIdByName(name, "sender");
                    nameToIdRef.current.set(cacheKey, pid ?? null);
                  } catch {
                    nameToIdRef.current.set(cacheKey, null);
                  }
                }
                sId = nameToIdRef.current.get(cacheKey);
              }

              if (!truthy(rId) && truthy(cargo?.receiver_name ?? cargo?.consignee_name)) {
                const name = cargo.receiver_name ?? cargo.consignee_name;
                const cacheKey = normKey("receiver", name);
                if (!nameToIdRef.current.has(cacheKey)) {
                  try {
                    // Try role-specific first, then generic (if your API supports)
                    const pid = await findPartyIdByName(name, "receiver");
                    if (!pid) {
                      const pid2 = await findPartyIdByName(name);
                      nameToIdRef.current.set(cacheKey, pid2 ?? null);
                    } else {
                      nameToIdRef.current.set(cacheKey, pid ?? null);
                    }
                  } catch {
                    nameToIdRef.current.set(cacheKey, null);
                  }
                }
                rId = nameToIdRef.current.get(cacheKey);
              }

              return { ...cargo, sender_id: sId ?? null, receiver_id: rId ?? null };
            } catch (e) {
              if (e?.response?.status === 404) {
                warn("Cargo not found (404)", { cid });
                return null;
              }
              warn("getCargoById failed", cid, e?.message);
              return null;
            }
          })
        );
        const list = detailed.filter(Boolean);
        if (!alive) return;
        setCargos(list);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cargoIds]);

  /* 3) Fetch parties for all cargos (by id) */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cargos.length) {
        setPartyMap({});
        return;
      }
      const toFetch = [];
      for (const c of cargos) {
        const s = getSenderId(c);
        const r = getReceiverId(c);
        if (!truthy(s) || !truthy(r)) {
          warn("Cargo missing party IDs (will still show names from cargo)", {
            cargo_id: c?.id,
            sender_id: s ?? null,
            receiver_id: r ?? null,
            sender_name: c?.sender_name ?? c?.shipper_name ?? null,
            receiver_name: c?.receiver_name ?? c?.consignee_name ?? null,
          });
        }
        if (truthy(s) && !partyMap[String(s)] && !inflightPartyRef.current.has(String(s))) {
          inflightPartyRef.current.add(String(s));
          toFetch.push(Number(s));
        }
        if (truthy(r) && !partyMap[String(r)] && !inflightPartyRef.current.has(String(r))) {
          inflightPartyRef.current.add(String(r));
          toFetch.push(Number(r));
        }
      }
      if (!toFetch.length) return;

      setPartyLoading(true);
      try {
        const entries = await Promise.allSettled(
          toFetch.map(async (pid) => {
            try {
              const party = await getPartyByIdFlexible(Number(pid));
              info("Party fetched", { party_id: pid, ok: !!party });
              return [String(pid), party ?? null];
            } catch (e) {
              warn("getPartyByIdFlexible failed", pid, e?.message);
              return [String(pid), null];
            }
          })
        );

        if (!alive) return;
        setPartyMap((prev) => {
          const next = { ...prev };
          entries.forEach((res) => {
            if (res.status === "fulfilled") {
              const [pid, party] = res.value;
              if (party) next[pid] = party;
            }
          });
          return next;
        });
      } finally {
        toFetch.forEach((pid) => inflightPartyRef.current.delete(String(pid)));
        if (alive) setPartyLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargos]);

  const rows = useMemo(() => (Array.isArray(cargos) ? cargos : []), [cargos]);
  const partyFor = (role, cargo) => {
    const id = role === "sender" ? getSenderId(cargo) : getReceiverId(cargo);
    return truthy(id) ? partyMap[String(id)] ?? null : null;
  };

  /* ================= Export to Excel ================= */
  const buildExportRecord = (c, idx) => {
    const items = extractItems(c);
    const pieces = sumPieces(items);
    const weightNum = Number(c?.total_weight) || sumWeight(items);
    const weightStr = Number.isFinite(weightNum) ? Math.trunc(weightNum) : weightNum;

    const sParty = partyFor("sender", c);
    const rParty = partyFor("receiver", c);

    const shipperName = sParty?.name ?? c?.sender_name ?? c?.shipper_name ?? "";
    const shipperAddr = addressFromParty(sParty) || addressFromCargo("sender", c) || "";
    const { phones: sPhonesArr, whatsapp: sWA } =
      sParty ? phonesOf(sParty) : phonesOf("sender", c);
    const shipperPhones = sPhonesArr.join(" / ");
    const shipperEmail = sParty?.email || c?.sender_email || "";
    const shipperContactLine = [shipperPhones || "", sWA && `WhatsApp: ${sWA}`, shipperEmail]
      .filter(truthy)
      .join(" | ");

    const consigneeName = rParty?.name ?? c?.receiver_name ?? c?.consignee_name ?? "";
    const consigneeAddr = addressFromParty(rParty) || addressFromCargo("receiver", c) || "";
    const consigneePin =
      rParty?.postal_code ??
      rParty?.pincode ??
      c?.receiver_postal_code ??
      c?.receiver_pincode ??
      "";

    const goods = descOfGoods(items) || "";
    const invoiceValue = c?.invoice_value ?? c?.net_total ?? c?.total_cost ?? "";
    const gstinType = c?.gstin_type ?? c?.gst_type ?? "";
    const gstinNo = c?.gstin_no ?? c?.gst_no ?? "";

    return {
      "Sl No": idx + 1,
      "Booking Number": fmt(c?.booking_no ?? c?.id),
      "No. of Pieces": fmt(pieces),
      "Weight (kg)": fmt(weightStr),
      "Shipper Details": [shipperName, shipperAddr, shipperContactLine].filter(truthy).join(" | "),
      "Consignee Name": fmt(consigneeName),
      "Consignee Address": fmt(consigneeAddr),
      "Consignee Pincode": fmt(consigneePin),
      "Description of Goods (with Qty)": fmt(goods),
      "Invoice Value *": fmt(money(invoiceValue)),
      "GSTIN Type *": fmt(gstinType),
      "GSTIN No *": fmt(gstinNo),
    };
  };

  const handleExportExcel = () => {
    try {
      const data = rows.map((c, idx) => buildExportRecord(c, idx));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Manifest");
      XLSX.writeFile(wb, `shipment_${id}_manifest.xlsx`);
      info("Excel exported", { rows: data.length });
    } catch (e) {
      errL("Excel export failed", e);
      alert("Export failed. Check console for details.");
    }
  };

  /* ================= Presentation helpers ================= */
  const CountBadge = ({ label, value, color = "bg-slate-100 text-slate-700" }) => (
    <span className={`inline-flex items-center gap-1 rounded-full ${color} px-2.5 py-1 text-xs font-medium`}>
      <span className="opacity-80">{label}:</span>
      <span className="font-semibold">{value}</span>
    </span>
  );

  const totalPieces = useMemo(
    () => rows.reduce((acc, c) => acc + sumPieces(extractItems(c)), 0),
    [rows]
  );
  const totalWeight = useMemo(
    () =>
      rows.reduce(
        (acc, c) => acc + (Number(c?.total_weight) || sumWeight(extractItems(c))),
        0
      ),
    [rows]
  );

  /* ================= Render ================= */
  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Custom Manifest</h1>
            <p className="mt-1 text-sm text-slate-600">
              Shipment ID: <span className="font-mono">{id}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CountBadge label="Rows" value={rows.length} />
            <CountBadge label="Pieces" value={totalPieces} color="bg-blue-50 text-blue-700" />
            <CountBadge
              label="Weight (kg)"
              value={intKg(totalWeight)}
              color="bg-teal-50 text-teal-700"
            />
            <button
              onClick={handleExportExcel}
              className="rounded-lg border border-green-300 bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || rows.length === 0}
              title={rows.length ? "Download Excel" : "No rows to export"}
            >
              Export Excel
            </button>
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-black"
            >
              Back
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[1200px] w-full text-sm [&_td]:align-top [&_th]:align-top">
            {/* Column sizing */}
            <colgroup>
              <col className="w-[70px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[480px]" />
              <col className="w-[380px]" />
              <col className="w-[140px]" />
              <col className="w-[420px]" />
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col className="w-[180px]" />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3">Sl No</th>
                <th className="px-4 py-3">Booking #</th>
                <th className="px-4 py-3 text-right">Pieces</th>
                <th className="px-4 py-3 text-right">Weight (kg)</th>
                <th className="px-4 py-3">Shipper Details</th>
                <th className="px-4 py-3">Consignee Details</th>
                <th className="px-4 py-3">Consignee Pin</th>
                <th className="px-4 py-3">Goods (with Qty)</th>
                <th className="px-4 py-3 text-right">Invoice Value *</th>
                <th className="px-4 py-3">GSTIN Type *</th>
                <th className="px-4 py-3">GSTIN No *</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : err ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-rose-700">
                    {err}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-slate-600">
                    No cargos found for this shipment.
                  </td>
                </tr>
              ) : (
                rows.map((c, idx) => {
                  const items = extractItems(c);
                  const pieces = sumPieces(items);
                  const weightNum = Number(c?.total_weight) || sumWeight(items);
                  const weightStr = Number.isFinite(weightNum) ? Math.trunc(weightNum) : weightNum;

                  const sParty = partyFor("sender", c);
                  const rParty = partyFor("receiver", c);
                  const sId = getSenderId(c);
                  const rId = getReceiverId(c);

                  // Shipper
                  const shipperName =
                    sParty?.name ?? c?.sender_name ?? c?.shipper_name ?? "—";
                  const shipperAddr =
                    addressFromParty(sParty) || addressFromCargo("sender", c) || "—";
                  const { phones: sPhonesArr, whatsapp: sWA } =
                    sParty ? phonesOf(sParty) : phonesOf("sender", c);
                  const shipperPhones = sPhonesArr.join(" / ");
                  const shipperEmail = sParty?.email || c?.sender_email || "";

                  const shipperDetails = (
                    <div className="space-y-1 leading-5">
                      <div className="font-medium text-slate-900">{fmt(shipperName)}</div>
                      <div className="text-slate-700">{fmt(shipperAddr)}</div>
                      <div className="text-xs text-slate-500">
                        {[shipperPhones || "", sWA && `WhatsApp: ${sWA}`, shipperEmail && `Email: ${shipperEmail}`]
                          .filter(truthy)
                          .join(" | ")}
                      </div>
                    </div>
                  );

                  // Consignee
                  const consigneeName =
                    rParty?.name ?? c?.receiver_name ?? c?.consignee_name ?? "—";
                  const consigneeAddr =
                    addressFromParty(rParty) || addressFromCargo("receiver", c) || "—";
                  const { phones: rPhonesArr, whatsapp: rWA } =
                    rParty ? phonesOf(rParty) : phonesOf("receiver", c);
                  const consigneePhones = rPhonesArr.join(" / ");
                  const consigneeEmail = rParty?.email || c?.receiver_email || "";
                  const consigneePin =
                    rParty?.postal_code ??
                    rParty?.pincode ??
                    c?.receiver_postal_code ??
                    c?.receiver_pincode ??
                    "—";

                  const consigneeDetails = (
                    <div className="space-y-1 leading-5">
                      <div className="font-medium text-slate-900">{fmt(consigneeName)}</div>
                      <div className="text-slate-700">{fmt(consigneeAddr)}</div>
                      <div className="text-xs text-slate-500">
                        {[consigneePhones || "", rWA && `WhatsApp: ${rWA}`, consigneeEmail && `Email: ${consigneeEmail}`]
                          .filter(truthy)
                          .join(" | ")}
                      </div>
                    </div>
                  );

                  const goods = descOfGoods(items) || "—";

                  const reqText = (v, fmtFn = (x) => x) =>
                    v || v === 0 ? fmtFn(v) : <span className="text-rose-600">Required</span>;

                  return (
                    <tr
                      key={c.id ?? idx}
                      className={idx % 2 ? "bg-white" : "bg-slate-50/30 hover:bg-slate-50"}
                    >
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono">{fmt(c?.booking_no ?? c?.id)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(pieces)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(weightStr)}</td>
                      <td className="px-4 py-3">
                        {partyLoading && truthy(sId) && !sParty ? "Loading…" : shipperDetails}
                      </td>
                      <td className="px-4 py-3">
                        {partyLoading && truthy(rId) && !rParty ? "Loading…" : consigneeDetails}
                      </td>
                      <td className="px-4 py-3">
                        {partyLoading && truthy(rId) && !rParty ? "Loading…" : fmt(consigneePin)}
                      </td>
                      <td className="px-4 py-3">{fmt(goods)}</td>
                      <td className="px-4 py-3 text-right tabular-nums"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
