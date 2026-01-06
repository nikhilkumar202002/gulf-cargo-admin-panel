// src/features/Operations/Excels/CustomManifest.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getCargoShipment, getCargoById } from "../../../services/cargoService";
import { getBranchById } from "../../../services/coreService";
import { getPartyByIdFlexible } from "../../../services/partyService";
import * as XLSX from "xlsx";

/* ================= DEBUG ================= */
const DEBUG = true; 
const info = (...a) => DEBUG && console.info("[Manifest]", ...a);
const warn = (...a) => DEBUG && console.warn("[Manifest]", ...a);
const errL = (...a) => DEBUG && console.error("[Manifest]", ...a);

/* ================= utils ================= */
const truthy = (v) => !(v == null || (typeof v === "string" && v.trim() === ""));
const fmt = (v) => (v === 0 || v ? String(v) : "—");
const money = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : "—");

// Helper to extract data from axios response
const unwrapData = (raw) => {
  const d = raw?.data ?? raw;
  if (!d) return null;
  if (d.success && d.cargo) return d.cargo;
  if (d.cargo) return d.cargo;
  if (d.data) return d.data;
  return d;
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

const getBoxCount = (c = {}) => {
  if (c?.no_of_pieces != null && !isNaN(Number(c.no_of_pieces))) return Number(c.no_of_pieces);
  if (c?.box_count != null && !isNaN(Number(c.box_count))) return Number(c.box_count);
  if (Array.isArray(c?.boxes)) return c.boxes.length;
  if (c?.boxes && typeof c.boxes === "object") return Object.keys(c.boxes).length;
  const items = extractItems(c);
  if (items.length > 0) {
    const uniq = new Set(items.map((it) => it?.box_number ?? it?.box_no ?? "1"));
    return uniq.size || 1;
  }
  return 0;
};

const sumWeight = (items = []) =>
  items.reduce((s, it) => s + Number(it?.weight ?? it?.weight_kg ?? 0), 0);
const descOfGoods = (items = []) =>
  items
    .map((it) => `${it?.name ?? it?.item_name ?? "Item"} - ${it?.piece_no ?? it?.pieces ?? it?.qty ?? 0}`)
    .join(", ");

const cleanJoin = (arr, separator = ", ") =>
  arr
    .filter(truthy)
    .join(separator)
    .replace(/\r?\n+/g, separator)
    .replace(new RegExp(`\\s*${separator.trim()}\\s*${separator.trim()}+`, "g"), separator)
    .trim();

// --- UPDATED: Fixed district fetching and combined city/district ---
const addressFromParty = (p) => {
  if (!p) return "";
  const line = [p.address, p.address_line1, p.address_line2].filter(truthy).join(", ");
  // Changed: Include both city AND district (and fallback for 'dist')
  return cleanJoin([line, p.city, p.district ?? p.dist, p.state, p.country]);
};

// --- UPDATED: Added fallback for _dist key ---
const addressFromCargo = (pfx, c = {}) =>
  cleanJoin([
    c?.[`${pfx}_address`],
    c?.[`${pfx}_city`],
    c?.[`${pfx}_district`] ?? c?.[`${pfx}_dist`], // Check both keys
    c?.[`${pfx}_state`],
    c?.[`${pfx}_country`],
  ]);

const phonesOf = (pOrPrefix, maybeCargo) => {
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
  const p = pOrPrefix ?? {};
  const nums = [p.contact_number, p.phone, p.mobile, p.mobile_number].filter(truthy);
  const wa = p.whatsapp_number ?? p.whatsapp ?? p.whats_app;
  return { phones: Array.from(new Set(nums)), whatsapp: truthy(wa) ? String(wa) : "" };
};

const getSenderId = (c = {}) =>
  c?.sender_id ?? c?.senderId ?? c?.sender_party_id ?? c?.senderPartyId ?? c?.shipper_id ?? c?.shipperId ?? null;
const getReceiverId = (c = {}) =>
  c?.receiver_id ?? c?.receiverId ?? c?.receiver_party_id ?? c?.receiverPartyId ?? c?.consignee_id ?? c?.consigneeId ?? null;

const intKg = (w) => {
  const n = Number(w);
  if (!Number.isFinite(n)) return fmt(w);
  return String(Math.trunc(n));
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

/* ================= component ================= */
export default function ShipmentManifest() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const stateIds = location.state?.selectedIds; 

  const [cargoIds, setCargoIds] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [partyMap, setPartyMap] = useState({});
  const [branchMap, setBranchMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const inflightBranchRef = useRef(new Set());

  // 1. Resolve IDs
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
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
        const ship = unwrapData(res);
        const ids = ship?.cargos?.map(c => Number(c.id)).filter(Boolean) || [];
        if (alive) setCargoIds(ids);
      } catch (e) {
        if (alive) setErr("Failed to load shipment");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, stateIds]);

  // 2. Fetch Cargo Data
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!cargoIds.length) return;
      setLoading(true);
      const list = await Promise.all(
        cargoIds.map(async (cid) => {
          try {
            const res = await getCargoById(cid);
            return unwrapData(res);
          } catch {
            return null;
          }
        })
      );
      if (alive) setCargos(list.filter(Boolean));
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [cargoIds]);

  // 3. Fetch Party Details
  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = new Set();
      cargos.forEach(c => {
        if (c.sender_id) ids.add(c.sender_id);
        if (c.receiver_id) ids.add(c.receiver_id);
      });
      const toFetch = [...ids].filter(id => !partyMap[id]);
      if (!toFetch.length) return;
      const results = await Promise.allSettled(
        toFetch.map(id => getPartyByIdFlexible(id))
      );
      if (!alive) return;
      setPartyMap(prev => {
        const next = { ...prev };
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            const d = unwrapData(r.value);
            if (d) next[toFetch[i]] = d;
          }
        });
        return next;
      });
    })();
    return () => { alive = false; };
  }, [cargos]);

  // 4. Fetch Branch Details (SIMPLIFIED & FIXED)
  useEffect(() => {
    let alive = true;
    (async () => {
      // Collect IDs - checking both branch_id and nested branch.id
      const allIds = cargos
        .map(c => c.branch_id || c.branch?.id)
        .filter(Boolean)
        .map(String);
        
      const uniqueIds = [...new Set(allIds)];
      
      const toFetch = uniqueIds.filter(id => !branchMap[id] && !inflightBranchRef.current.has(id));

      if (!toFetch.length) return;

      toFetch.forEach(id => inflightBranchRef.current.add(id));

      const results = await Promise.allSettled(
        toFetch.map(id => getBranchById(id))
      );

      if (!alive) return;

      setBranchMap(prev => {
        const next = { ...prev };
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            const b = r.value;
            if (b) next[toFetch[i]] = b;
          }
        });
        return next;
      });

      toFetch.forEach(id => inflightBranchRef.current.delete(id));
    })();
    return () => { alive = false; };
  }, [cargos]);

  const rows = useMemo(() => (Array.isArray(cargos) ? cargos : []), [cargos]);
  
  const partyFor = (role, cargo) => {
    const id = role === "sender" ? getSenderId(cargo) : getReceiverId(cargo);
    return truthy(id) ? partyMap[String(id)] ?? null : null;
  };

  /* --- Helper: Get branch from MAP first --- */
  const getBranchDetails = (c) => {
    const bId = c.branch_id || c.branch?.id;
    // 1. Try Map (Preferred: contains full details)
    if (bId && branchMap[String(bId)]) {
        return branchMap[String(bId)];
    }
    // 2. Fallback: Use cargo's internal branch object
    if (c.branch && typeof c.branch === 'object') {
        return c.branch;
    }
    return {};
  };

  /* ================= Export Logic ================= */
  const buildExportRecord = (c, idx) => {
    const items = extractItems(c);
    const boxCount = getBoxCount(c);
    const weightNum = Number(c?.total_weight) || sumWeight(items);
    const weightStr = Number.isFinite(weightNum) ? Math.trunc(weightNum) : weightNum;

    const sParty = partyFor("sender", c);
    const rParty = partyFor("receiver", c);
    
    // Get Branch
    const branch = getBranchDetails(c);

    const senderName = sParty?.name ?? c?.sender_name ?? c?.shipper_name ?? "—";
    const senderPhoneRaw = (phonesOf(sParty || "sender", c).phones[0]) || "";
    const senderPhone = stripCountryCode(senderPhoneRaw);
    const senderPart = `${senderName} ${senderPhone}`;

    // Normalize Branch Address
    const bAddr = branch?.branch_address ?? branch?.address ?? "";
    const bLoc = branch?.branch_location ?? branch?.location ?? "";
    
    const branchAddressPart = cleanJoin([bAddr, bLoc], ", ");

    // Normalize Branch Phone
    const bPhoneRaw = branch?.branch_contact_number ?? branch?.branch_alternative_number ?? branch?.contact_number ?? branch?.phone ?? "";
    const branchPhone = stripCountryCode(bPhoneRaw);

    const shipperDetails = cleanJoin([senderPart, branchAddressPart, branchPhone], ",");

    const consigneeName = rParty?.name ?? c?.receiver_name ?? c?.consignee_name ?? "";
    const consigneeAddr = addressFromParty(rParty) || addressFromCargo("receiver", c) || "";
    const pin = rParty?.postal_code ?? rParty?.pincode ?? c?.receiver_postal_code ?? c?.receiver_pincode ?? "";
    const consigneePin = pin ? `PIN ${pin}` : "";

    // --- UPDATED: Phone + WhatsApp Logic ---
    const { phones: rPhonesArr, whatsapp: rWhatsapp } = rParty ? phonesOf(rParty) : phonesOf("receiver", c);
    
    const allPhones = [...rPhonesArr];
    if (truthy(rWhatsapp) && !allPhones.includes(rWhatsapp)) {
        allPhones.push(rWhatsapp);
    }
    const consigneePhones = allPhones.length ? `PHONE ${allPhones.join(" / ")}` : "";
    
    const fullConsigneeString = cleanJoin([consigneeName, consigneeAddr, consigneePin, consigneePhones], ", ");

    const goods = descOfGoods(items) || "";
    const invoiceValue = c?.invoice_value ?? c?.net_total ?? c?.total_cost ?? "";
    const gstinType = c?.gstin_type ?? c?.gst_type ?? "";
    const gstinNo = c?.gstin_no ?? c?.gst_no ?? "";

    return {
      "Sl No": idx + 1,
      "Booking Number": fmt(c?.booking_no ?? c?.id),
      "No. of Pieces": fmt(boxCount),
      "Weight (kg)": fmt(weightStr),
      "Shipper Details": shipperDetails,
      "Consignee Details": fullConsigneeString,
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
      XLSX.writeFile(wb, `shipment_${id || 'custom'}_manifest.xlsx`);
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
    () => rows.reduce((acc, c) => acc + getBoxCount(c), 0),
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
    <section className="min-h-screen">
      <div className="mx-auto w-full">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Custom Manifest</h1>
            <p className="mt-1 text-sm text-slate-600">
              {id ? <>Shipment ID: <span className="font-mono">{id}</span></> : <span>Selected Cargo List</span>}
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
            <colgroup>
              <col className="w-[70px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[450px]" />
              <col className="w-[450px]" />
              <col className="w-[200px]" />
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col className="w-[180px]" />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="text-left text-slate-700">
                <th className="px-4 py-3">Sl No</th>
                <th className="px-4 py-3">HAWB NO</th>
                <th className="px-4 py-3 text-right">Pieces</th>
                <th className="px-4 py-3 text-right">Weight (kg)</th>
                <th className="px-4 py-3">Shipper Details</th>
                <th className="px-4 py-3">Consignee Details</th>
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
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 w-3/4 rounded bg-slate-200" />
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
                  const pieces = getBoxCount(c);
                  const weightNum = Number(c?.total_weight) || sumWeight(items);
                  const weightStr = Number.isFinite(weightNum) ? Math.trunc(weightNum) : weightNum;

                  const sParty = partyFor("sender", c);
                  const rParty = partyFor("receiver", c);
                  
                  // Use robust helper
                  const branch = getBranchDetails(c);

                  // --- Shipper Display Logic ---
                  const senderName = sParty?.name ?? c?.sender_name ?? c?.shipper_name ?? "—";
                  const senderPhoneRaw = (phonesOf(sParty || "sender", c).phones[0]) || "";
                  const senderPhone = stripCountryCode(senderPhoneRaw);
                  const senderPart = `${senderName} ${senderPhone}`;

                  // Fallback for address fields
                  const bAddr = branch?.branch_address ?? branch?.address ?? "";
                  const bLoc = branch?.branch_location ?? branch?.location ?? "";
                  
                  const branchAddressPart = cleanJoin([bAddr, bLoc], ", ");

                  const bPhoneRaw = branch?.branch_contact_number ?? branch?.branch_alternative_number ?? branch?.contact_number ?? branch?.phone ?? "";
                  const branchPhone = stripCountryCode(bPhoneRaw);

                  const shipperText = cleanJoin([
                    senderPart,
                    branchAddressPart,
                    branchPhone,
                  ], ",");

                  const shipperDetails = (
                    <div className="space-y-1 leading-5">
                      <div className="text-sm text-slate-800 break-words">{fmt(shipperText)}</div>
                    </div>
                  );

                  // Consignee Display Logic
                  const consigneeName = rParty?.name ?? c?.receiver_name ?? c?.consignee_name ?? "—";
                  const consigneeAddr = addressFromParty(rParty) || addressFromCargo("receiver", c) || "—";
                  const pinRaw = rParty?.postal_code ?? rParty?.pincode ?? c?.receiver_postal_code ?? c?.receiver_pincode;
                  const consigneePin = pinRaw ? `PIN ${pinRaw}` : "";

                  // --- UPDATED: Phone + WhatsApp Logic ---
                  const { phones: rPhonesArr, whatsapp: rWhatsapp } = rParty ? phonesOf(rParty) : phonesOf("receiver", c);
                  const allPhones = [...rPhonesArr];
                  if (truthy(rWhatsapp) && !allPhones.includes(rWhatsapp)) {
                    allPhones.push(rWhatsapp);
                  }
                  const consigneePhones = allPhones.length ? `PHONE ${allPhones.join(" / ")}` : "";

                  const consigneeText = cleanJoin([consigneeName, consigneeAddr, consigneePin, consigneePhones], ", ");

                  const consigneeDetails = (
                    <div className="space-y-1 leading-5">
                      <div className="text-sm text-slate-800">{fmt(consigneeText)}</div>
                    </div>
                  );

                  const goods = descOfGoods(items) || "—";
                  const invoiceValue = c?.invoice_value ?? c?.net_total ?? c?.total_cost ?? "";
                  const gstinType = c?.gstin_type ?? c?.gst_type ?? "";
                  const gstinNo = c?.gstin_no ?? c?.gst_no ?? "";

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
                        {loading && truthy(getSenderId(c)) && !sParty ? "Loading…" : shipperDetails}
                      </td>
                      <td className="px-4 py-3">
                        {loading && truthy(getReceiverId(c)) && !rParty ? "Loading…" : consigneeDetails}
                      </td>
                      <td className="px-4 py-3">{fmt(goods)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(money(invoiceValue))}</td>
                      <td className="px-4 py-3">{fmt(gstinType)}</td>
                      <td className="px-4 py-3">{fmt(gstinNo)}</td>
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