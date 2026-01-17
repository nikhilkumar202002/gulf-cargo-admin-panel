// src/features/Operations/Excels/DeliveryList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getCargoShipment, getCargoById } from "../../../services/cargoService";
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

const cleanJoin = (arr, separator = ", ") =>
  arr
    .filter(truthy)
    .join(separator)
    .replace(/\r?\n+/g, separator)
    .replace(new RegExp(`\\s*${separator.trim()}\\s*${separator.trim()}+`, "g"), separator)
    .trim();

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

// Calculate Box Count
const getBoxCount = (c = {}) => {
  if (c?.box_count != null && !isNaN(Number(c.box_count))) return Number(c.box_count);
  if (Array.isArray(c?.boxes)) return c.boxes.length;
  if (c?.boxes && typeof c.boxes === "object") return Object.keys(c.boxes).length;
  const items = extractItems(c);
  if (items.length > 0) {
    const uniq = new Set(items.map((it) => String(it?.box_number ?? it?.box_no ?? "1")));
    return uniq.size || 1;
  }
  return 0;
};

const sumWeight = (items = []) =>
  items.reduce((s, it) => s + Number(it?.weight ?? it?.weight_kg ?? 0), 0);

// --- Weight Breakdown Helper (10+20+30) ---
const parseBoxWeights = (raw) => {
  if (raw == null || raw === "" || raw === "null") return [];
  try {
    if (typeof raw === "string") {
      if (raw.includes(",") && !raw.trim().startsWith("{") && !raw.trim().startsWith("[")) {
        return raw.split(",").map(s => Number(s.trim())).filter(n => Number.isFinite(n));
      }
      return parseBoxWeights(JSON.parse(raw));
    }
    if (Array.isArray(raw)) return raw.map(Number).filter(Number.isFinite);
    if (typeof raw === "object") return Object.values(raw).map(Number).filter(Number.isFinite);
  } catch { /* ignore */ }
  return [];
};

const getWeightBreakdown = (c) => {
    // 1. Try parsed box_weight
    let weights = parseBoxWeights(c.box_weight);
    
    // 2. Try boxes array/object
    if (weights.length === 0) {
        if (Array.isArray(c.boxes)) {
            weights = c.boxes.map(b => Number(b.weight || b.box_weight || 0));
        } else if (c.boxes && typeof c.boxes === 'object') {
            weights = Object.values(c.boxes).map(b => Number(b.weight || b.box_weight || 0));
        }
    }

    // 3. Filter valid weights
    weights = weights.filter(w => w > 0);

    // 4. Return formatted string or total weight if single/empty
    if (weights.length > 1) {
        return weights.join("+");
    } else if (weights.length === 1) {
        return String(weights[0]);
    }
    
    // Fallback
    const total = Number(c.total_weight);
    return Number.isFinite(total) && total > 0 ? String(total) : "—";
};

// --- Address Logic ---
const addressFromParty = (p) => {
  if (!p) return "";
  const line = [p.address, p.address_line1, p.address_line2].filter(truthy).join(", ");
  return cleanJoin([line, p.city, p.district ?? p.dist, p.state, p.country]);
};

const addressFromCargo = (pfx, c = {}) =>
  cleanJoin([
    c?.[`${pfx}_address`],
    c?.[`${pfx}_city`],
    c?.[`${pfx}_district`] ?? c?.[`${pfx}_dist`],
    c?.[`${pfx}_state`],
    c?.[`${pfx}_country`],
  ]);

const consigneeState = (c = {}, party = null) =>
  party?.state ??
  c.receiver_state ??
  c.consignee_state ??
  "";

// --- Phone Logic ---
const phonesOf = (pOrPrefix, maybeCargo) => {
  if (typeof pOrPrefix === "string") {
    const pfx = pOrPrefix;
    const o = maybeCargo ?? {};
    const nums = [
      o[`${pfx}_contact_number`],
      o[`${pfx}_phone`],
      o[`${pfx}_mobile`],
      o[`${pfx}_whatsapp`],
      o[`${pfx}_whatsapp_number`],
      o?.contact_number,
      o?.phone,
      o?.mobile,
      o?.whatsapp,
      o?.whatsapp_number
    ].filter(truthy);
    return { phones: Array.from(new Set(nums)) };
  }
  const p = pOrPrefix ?? {};
  const nums = [
    p.contact_number, 
    p.phone, 
    p.mobile, 
    p.mobile_number,
    p.whatsapp,
    p.whatsapp_number
  ].filter(truthy);
  return { phones: Array.from(new Set(nums)) };
};

const stripCountryCode = (phone) => {
  if (!phone) return "";
  let s = String(phone).replace(/[^0-9]/g, ""); 
  const codes = ["966", "971", "965", "968", "973", "974", "91", "92", "880", "977", "63", "62", "94", "20", "249"];
  for (const c of codes) {
    if (s.startsWith(c)) {
      if (s.length - c.length >= 7) return s.slice(c.length);
    }
    if (s.startsWith("00" + c)) {
        if (s.length - (c.length + 2) >= 7) return s.slice(c.length + 2);
    }
  }
  return s; 
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
  const location = useLocation();
  const stateIds = location.state?.selectedIds;

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
      
      // Use state IDs if available
      if (stateIds && stateIds.length > 0) {
          setCargoIds(stateIds);
          setLoading(false);
          return;
      }

      if (!id) {
          setLoading(false);
          return;
      }

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
  }, [id, stateIds]);

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
                }
                if (!truthy(rId) && truthy(cargo?.receiver_name ?? cargo?.consignee_name)) {
                  const name = cargo?.receiver_name ?? cargo?.consignee_name;
                  rId = await findPartyIdByName(name, "receiver");
                }

                return { ...cargo, sender_id: sId ?? null, receiver_id: rId ?? null };
              } catch (e) {
                if (e?.response?.status === 404) { warn("Cargo not found (404)", { cid }); return null; }
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
                return [pid, party ?? null];
              } catch (e) {
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

  const senderPartyFor = (cargo) => {
    const id = getSenderId(cargo);
    return truthy(id) ? partyMap[String(id)] ?? null : null;
  };

  /** ===== Excel export ===== */
  const buildExportRow = (c, idx) => {
    const items = extractItems(c);
    const pieces = getBoxCount(c);

    // Weights
    const weightBreakdown = getWeightBreakdown(c);
    const weightRaw = Number(c?.total_weight);
    const weight = Number.isFinite(weightRaw) ? weightRaw : sumWeight(items);
    const totalWeight = Number.isFinite(weight) ? Math.trunc(weight) : "";

    // Parties
    const rParty = receiverPartyFor(c);
    const sParty = senderPartyFor(c);
    
    // Consignee
    const consigneeName = rParty?.name ?? c?.receiver_name ?? c?.consignee_name ?? "";
    const consigneeAddr = addressFromParty(rParty) || addressFromCargo("receiver", c) || "";
    const consigneeFull = cleanJoin([consigneeName, consigneeAddr], ", ");
    
    // Mobile (Join all numbers with /)
    const { phones: rPhones } = rParty ? phonesOf(rParty) : phonesOf("receiver", c);
    const mobileNo = rPhones.map(stripCountryCode).filter(Boolean).join(" / ");
    
    // Post Code
    const postCode = rParty?.postal_code ?? rParty?.pincode ?? c?.receiver_postal_code ?? c?.receiver_pincode ?? "";

    // Shipper (Name + Single Phone)
    const shipperName = sParty?.name ?? c?.sender_name ?? c?.shipper_name ?? "";
    const { phones: sPhones } = sParty ? phonesOf(sParty) : phonesOf("sender", c);
    const shipperPhone = sPhones[0] ? stripCountryCode(sPhones[0]) : "";
    const shipperFull = `${shipperName} ${shipperPhone}`.trim();

    // State
    const state = consigneeState(c, rParty);

    return {
      "SL NO": idx + 1,
      "BILL NO": c?.booking_no ?? c?.id ?? "",
      "NO.PCS": pieces || 0,
      "KG": weightBreakdown,
      "TOTAL WGT": totalWeight,
      "State": state || "",
      "CONSIGNEE": consigneeFull,
      "POST CODE": postCode,
      "MOBILE NUMBER": mobileNo,
      "SHIPPER": shipperFull
    };
  };

  const handleExportExcel = () => {
    try {
      const data = rows.map((c, idx) => buildExportRow(c, idx));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Delivery List");
      XLSX.writeFile(wb, `shipment_${id || 'custom'}_delivery_list.xlsx`);
      info("Excel exported", { rows: data.length });
    } catch (e) {
      errL("Excel export failed", e);
      alert("Export failed. Check console for details.");
    }
  };

  /** ===== UI ===== */
  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Delivery List</h1>
            <p className="mt-1 text-sm text-slate-600">
              {id ? <>Shipment ID: <span className="font-mono">{id}</span></> : <span>Selected Cargo List</span>}
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
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-white hover:bg-black"
            >
              Back
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1400px] w-full text-xs [&_td]:align-middle [&_th]:align-middle">
            <colgroup>
              <col className="w-[50px]" />  {/* SL */}
              <col className="w-[120px]" /> {/* Bill */}
              <col className="w-[60px]" />  {/* Pcs */}
              <col className="w-[100px]" /> {/* KG (10+20) */}
              <col className="w-[80px]" />  {/* Total Wgt */}
              <col className="w-[100px]" /> {/* State */}
              <col className="w-[300px]" /> {/* Consignee */}
              <col className="w-[80px]" />  {/* Post */}
              <col className="w-[100px]" /> {/* Mobile */}
              <col className="w-[200px]" /> {/* Shipper */}
            </colgroup>

            <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
              <tr className="text-left border-b border-slate-200">
                <th className="px-3 py-3">SL NO</th>
                <th className="px-3 py-3">BILL NO</th>
                <th className="px-3 py-3 text-center">NO.PCS</th>
                <th className="px-3 py-3 text-center">KG</th>
                <th className="px-3 py-3 text-center">TOTAL WGT</th>
                <th className="px-3 py-3">State</th>
                <th className="px-3 py-3">CONSIGNEE</th>
                <th className="px-3 py-3">POST CODE</th>
                <th className="px-3 py-3">MOBILE NUMBER</th>
                <th className="px-3 py-3">SHIPPER</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-3 w-3/4 rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : err ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-rose-700">
                    {err}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-slate-600">
                    No cargos found for this shipment.
                  </td>
                </tr>
              ) : (
                rows.map((c, idx) => {
                  const items = extractItems(c);
                  
                  // 1. Pieces
                  const pieces = getBoxCount(c);

                  // 2. Weights
                  const weightBreakdown = getWeightBreakdown(c);
                  const weightRaw = Number(c?.total_weight);
                  const weight = Number.isFinite(weightRaw) ? weightRaw : sumWeight(items);
                  const totalWeight = Number.isFinite(weight) ? String(Math.trunc(weight)) : "—";

                  // 3. Parties
                  const rParty = receiverPartyFor(c);
                  const sParty = senderPartyFor(c);

                  // 4. Consignee (Name + Address)
                  const consigneeName = rParty?.name ?? c?.receiver_name ?? c?.consignee_name ?? "—";
                  const consigneeAddr = addressFromParty(rParty) || addressFromCargo("receiver", c) || "—";
                  
                  // 5. Post Code
                  const postCode = rParty?.postal_code ?? rParty?.pincode ?? c?.receiver_postal_code ?? c?.receiver_pincode ?? "—";

                  // 6. Mobile (Join all numbers with /)
                  const { phones: rPhones } = rParty ? phonesOf(rParty) : phonesOf("receiver", c);
                  const mobileNo = rPhones.length > 0 
                      ? rPhones.map(stripCountryCode).filter(Boolean).join(" / ") 
                      : "—";

                  // 7. Shipper (Name + Single Phone)
                  const shipperName = sParty?.name ?? c?.sender_name ?? c?.shipper_name ?? "—";
                  const { phones: sPhones } = sParty ? phonesOf(sParty) : phonesOf("sender", c);
                  const shipperPhone = sPhones[0] ? stripCountryCode(sPhones[0]) : "";
                  const shipperFull = `${shipperName} ${shipperPhone}`.trim();

                  // 8. State
                  const state = consigneeState(c, rParty);

                  return (
                    <tr
                      key={c.id ?? `${idx}-${c?.booking_no ?? ""}`}
                      className={idx % 2 ? "bg-white" : "bg-slate-50/50 hover:bg-slate-50"}
                    >
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-medium">{fmt(c?.booking_no ?? c?.id)}</td>
                      <td className="px-3 py-2 text-center">{fmt(pieces)}</td>
                      <td className="px-3 py-2 text-center font-mono text-[11px] leading-tight max-w-[120px] break-words">
                         {weightBreakdown}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold">{fmt(totalWeight)}</td>
                      <td className="px-3 py-2">{fmt(state)}</td>
                      
                      <td className="px-3 py-2">
                         <div className="font-semibold text-slate-900">{consigneeName}</div>
                         <div className="text-[11px] text-slate-600 leading-tight">{consigneeAddr}</div>
                      </td>

                      <td className="px-3 py-2">{fmt(postCode)}</td>
                      <td className="px-3 py-2 font-mono">{mobileNo}</td>
                      <td className="px-3 py-2 text-[11px] leading-tight">{shipperFull}</td>
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