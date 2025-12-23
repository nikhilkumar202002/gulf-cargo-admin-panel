// src/pages/InvoiceView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { normalizeCargoToInvoice, getCargoById } from "../../../services/cargoService";
import { getPartyById, getParties } from "../../../services/partyService";
import { getBranchByIdSmart } from "../../../services/coreService";
import InvoiceLogo from "../../../assets/logo.png";
import "./invoice.css";

const MONEY_LOCALE = "en-SA";
const DEFAULT_CURRENCY = "SAR";

/* ---------------- utils ---------------- */
const toNum = (v) =>
  v === null || v === undefined || v === "" ? 0 : Number(v) || 0;

const fmtMoney = (n, currency = DEFAULT_CURRENCY) => {
  if (n === null || n === undefined || n === "") return "—";
  try {
    return new Intl.NumberFormat(MONEY_LOCALE, {
      style: "currency",
      currency,
    }).format(Number(n) || 0);
  } catch {
    return String(n);
  }
};

const s = (v, d = "—") =>
  v === null || v === undefined || String(v).trim() === "" ? d : v;
const pickPhoneFromBranch = (b) => {
  if (!b) return "—";
  return [b.branch_contact_number, b.branch_alternative_number]
    .filter(Boolean)
    .join(" | ");
};

// Safe numeric picker from multiple paths (no "—" fallback)
const pickNum = (obj, paths) => {
  for (const p of paths) {
    const segs = String(p).split(".");
    let cur = obj;
    let ok = !!cur;
    for (const s of segs) {
      if (cur == null || cur[s] == null || cur[s] === "") {
        ok = false;
        break;
      }
      cur = cur[s];
    }
    if (ok && cur !== undefined) {
      const n = Number(String(cur).replace(/,/g, "").trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
};

const getTrackCode = (s) =>
  s?.track_code ??
  s?.tracking_code ??
  s?.tracking_no ??
  s?.trackingNumber ??
  "";

const pick = (obj, keys, fallback = "—") => {
  for (const k of keys) {
    const path = String(k).split(".");
    let cur = obj;
    let ok = !!cur;
    for (const p of path) {
      if (cur == null || cur[p] == null || String(cur[p]).trim() === "") {
        ok = false;
        break;
      }
      cur = cur[p];
    }
    if (ok && cur !== undefined && cur !== null && String(cur).trim() !== "")
      return cur;
  }
  return fallback;
};

const toFixed3 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
};

/** Parse many possible shapes of `box_weight` into a numeric array in **index order** (1-based keys allowed) */
const parseBoxWeights = (raw) => {
  if (raw == null || raw === "" || raw === "null" || raw === "undefined")
    return [];
  try {
    // JSON string?
    if (typeof raw === "string") {
      if (
        raw.includes(",") &&
        !raw.trim().startsWith("{") &&
        !raw.trim().startsWith("[")
      ) {
        return raw
          .split(",")
          .map((s) => Number(String(s).trim()))
          .map((n) => (Number.isFinite(n) ? n : 0));
      }
      const parsed = JSON.parse(raw);
      return parseBoxWeights(parsed);
    }
  } catch {
    /* fall through */
  }
  // Already an array
  if (Array.isArray(raw)) {
    return raw.map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));
  }
  // Object with numeric-ish keys: { "1": 10, "2": 20 }
  if (raw && typeof raw === "object") {
    const keys = Object.keys(raw).sort((a, b) => Number(a) - Number(b));
    return keys.map((k) =>
      Number.isFinite(Number(raw[k])) ? Number(raw[k]) : 0
    );
  }
  // Fallback single number
  const n = Number(raw);
  return Number.isFinite(n) ? [n] : [];
};

/** Make `shipment.boxes` consistent: accepts object, array, JSON string, or { boxes: [...] } */
const coerceBoxes = (raw) => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return coerceBoxes(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (Array.isArray(raw)) {
    const out = {};
    raw.forEach((b, i) => {
      out[String(i + 1)] = b || {};
    });
    return out;
  }
  if (raw && typeof raw === "object" && raw.boxes)
    return coerceBoxes(raw.boxes);
  return raw && typeof raw === "object" ? raw : {};
};

/** If no boxes, group flat items by their box number to "simulate" boxes */
const groupItemsIntoBoxes = (items = []) => {
  const map = {};
  items.forEach((it) => {
    const rawBox =
      it?.box_number ?? it?.box_no ?? it?.box ?? it?.package_no ?? "";
    const key = rawBox ? String(rawBox) : "1";
    if (!map[key]) map[key] = { items: [] };
    map[key].items.push(it);
  });
  return map;
};

/** Sum item weights (handles string/number, weight_kg, etc.) */
const sumItemWeights = (arr = []) =>
  arr.reduce((s, it) => {
    const n = Number(it?.weight ?? it?.weight_kg ?? 0);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

/* ---------------- Company header (only VAT/type used) ---------------- */
const COMPANY = {
  vatNo: "310434479300003",
  defaultShipmentType: "IND AIR",
};

/* ---------------- Party helpers ---------------- */
const parsePartyList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.parties)) return res.parties;
  if (Array.isArray(res?.data?.parties)) return res.data.parties;
  return [];
};

const joinAddress = (p) => p?.address || "";

const formatPhones = (p) => {
  const vals = [
    p?.contact_number,
    p?.phone,
    p?.mobile,
    p?.mobile_number,
    p?.contact,
  ].filter(Boolean);
  const whats = p?.whatsapp_number ?? p?.whatsapp ?? null;
  const a = [];
  if (vals.length) a.push(vals.join(" / "));
  if (whats && !vals.includes(whats)) a.push(whats);
  return a.join("  •  ");
};

const extractParty = (p) => ({
  id: p?.id ?? null,
  name: p?.name || "—",
  email: p?.email || "",
  document_type: p?.document_type || "",
  document_id: p?.document_id || "",
  tel: p?.contact_number || p?.whatsapp_number || "",
  address_line: p?.address || p?.address_line || "",
  post: p?.post || "", 
  city: p?.city || "",
  pin: p?.postal_code || p?.pincode || "",
  dist: p?.district || "",
  state: p?.state || "",
  country: p?.country || "", 
  address: p?.address || "",
  phones: formatPhones(p),
  raw: p,
});

// --- UPDATED MATCH HELPER: CHECKS NAME AND PHONE ---
const matchByNameAndPhone = (name, phone, list) => {
  if (!name) return null;
  const lowName = name.toLowerCase().trim();
  const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, "") : "";

  // 1. Try finding Exact Name + Matching Phone (most accurate)
  if (cleanPhone) {
    const exactMatch = list.find(x => {
        const xName = (x?.name || "").toLowerCase().trim();
        const xPhone = String(x?.contact_number || x?.phone || x?.mobile || "").replace(/[^0-9]/g, "");
        return xName === lowName && xPhone.includes(cleanPhone);
    });
    if (exactMatch) return exactMatch;
  }

  // 2. Fallback: Loose Name match (Legacy behavior)
  return (
    list.find((x) => (x?.name || "").toLowerCase() === lowName) ||
    list.find((x) => (x?.name || "").toLowerCase().includes(lowName)) ||
    null
  );
};

// Extracts only the number part from invoice string (removes prefixes like RUH-)
const getCleanInvoiceNo = (raw) => {
  if (!raw) return "";
  // Match the last continuous sequence of digits at the end of the string
  const match = String(raw).match(/(\d+)$/);
  return match ? match[1] : raw;
};

// Build QR Code URL with the specific format requested
const buildTrackingQrUrl = (invoiceNo) => {
  const cleanNo = getCleanInvoiceNo(invoiceNo);
  return `https://gulfcargoksa.com/Orderdetails/shipment/?invoice=${cleanNo}`;
};

const buildQrUrl = (url, size = 160) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    url
  )}`;

/* ---------- Read logged-in user from localStorage (for branch.id fallback) ---------- */
const getLoggedInUser = () => {
  try {
    const keys = ["auth", "user", "authUser", "profile", "currentUser"];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") return obj.user || obj;
    }
  } catch {}
  return null;
};

/** Try to read pieces from common fields; else sum item qty */
const computePieces = (sh, boxRows, items) => {
  if (!sh) return "—";

  // 1. Try to get a top-level pieces count first
  const topLevelPieces = pick(
    sh,
    ["no_of_pieces", "pieces", "total_pieces", "no_of_boxes", "box_count"],
    null
  );
  if (topLevelPieces !== null && Number(topLevelPieces) > 0) {
    return Number(topLevelPieces);
  }

  // 2. Fallback to number of calculated box rows
  if (boxRows?.length > 0) {
    return boxRows.length;
  }

  // 3. Fallback to summing item quantities
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  if (totalQty > 0) return totalQty;

  return "—";
};

/** Pick a reasonable shipment date (booking/shipment/created) */
const pickShipmentDate = (sh) => {
  const candidates = [
    sh?.booking_date,
    sh?.shipment_date,
    sh?.invoice_date,
    sh?.created_at,
    sh?.createdAt,
    sh?.date,
  ].filter(Boolean);
  const raw = candidates[0];
  const d = raw ? new Date(raw) : new Date(); 
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-GB"); 
};

/* ---------------- Component ---------------- */
export default function InvoiceView({
  shipment: injected = null,
  modal = false,
}) {
  const { id } = useParams();
  const location = useLocation();

  const hydratedFromState =
    location.state?.cargo || location.state?.shipment || null;
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(
    !!id && !injected && !hydratedFromState
  );
  const [err, setErr] = useState("");

  const [senderParty, setSenderParty] = useState(null);
  const [receiverParty, setReceiverParty] = useState(null);
  const [branch, setBranch] = useState(null);

  const loggedInUser = useMemo(() => getLoggedInUser(), []);
  
  // Calculate billNo for use in URL
  const billNo = useMemo(
    () => shipment?.booking_no ?? shipment?.invoice_no ?? "—",
    [shipment]
  );
  
  // Construct the new QR URL
  const qrTargetUrl = buildTrackingQrUrl(billNo);

  useEffect(() => {
    const hydratedBranch = location.state?.branch || null;
    if (hydratedBranch) {
      setBranch(hydratedBranch);
    }
  }, [location.state?.branch]);

  useEffect(() => {
    (async () => {
      try {
        if (injected) {
          setShipment(normalizeCargoToInvoice(injected));
          return;
        }
        if (hydratedFromState) {
          setShipment(normalizeCargoToInvoice(hydratedFromState));
          return;
        }
        if (id) {
          setLoading(true);
          const cargo = await getCargoById(id);
          setShipment(normalizeCargoToInvoice({ cargo }));
        }
      } catch (e) {
        setErr(e?.message || "Failed to load cargo");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, injected, hydratedFromState]);

  /* ------------- Fetch branch ------------- */
  useEffect(() => {
    if ((!shipment && !loggedInUser) || branch) return; 

    const idCandidates = (
      shipment
        ? [shipment.branch_id, shipment.branch?.id, shipment.origin_branch_id]
        : []
    )
      .concat([loggedInUser?.branch?.id, loggedInUser?.branch_id])
      .map((v) => (v == null ? null : String(v).trim()))
      .filter(Boolean);

    const finalId =
      loggedInUser?.branch_id || loggedInUser?.branch?.id || idCandidates[0];

    if (!finalId) return;

    let alive = true;
    (async () => {
      try {
        const b = await getBranchByIdSmart(finalId);
        if (b && alive) {
          setBranch(b);
        }
      } catch {
        if (alive) setBranch(null); 
      }
    })();

    return () => {
      alive = false;
    };
  }, [shipment, loggedInUser, branch]);

  // fetch Sender/Receiver party once we have shipment basics
  useEffect(() => {
    if (!shipment) return;

    const fetchParty = async (role, allParties) => {
      const isSender = role === "sender";

      // 1. TRUST THE SHIPMENT OBJECT FIRST if it's already fully populated
      const directObj = isSender ? shipment.sender : shipment.receiver;
      if (directObj && typeof directObj === 'object' && directObj.id) {
          const expectedId = isSender ? shipment.sender_id : shipment.receiver_id;
          if (!expectedId || String(directObj.id) === String(expectedId)) {
             return extractParty(directObj);
          }
      }

      const idCandidates = isSender
        ? [
            shipment.sender_id,
            shipment.shipper_id,
            shipment.sender_party_id,
            shipment.shipper_party_id,
          ]
        : [
            shipment.receiver_id,
            shipment.consignee_id,
            shipment.receiver_party_id,
            shipment.consignee_party_id,
          ];

      const name = isSender
        ? shipment.sender?.name || shipment.sender || shipment.shipper_name
        : shipment.receiver?.name ||
          shipment.receiver ||
          shipment.consignee_name;

      // 2. Try ID Lookup
      for (const pid of idCandidates) {
        if (!pid) continue;
        try {
          const res = await getPartyById(pid);
          const data = res?.party || res?.data || res;
          if (data?.id) return extractParty(data);
        } catch {}
      }

      // 3. Fallback: Search by Name AND Phone
      if (name) {
        const list =
          allParties ||
          parsePartyList(await getParties({ search: name }).catch(() => []));
        
        const roleFiltered = list.filter((p) => {
          const typeId = Number(p.customer_type_id);
          const typeName = String(p.customer_type || "").toLowerCase();
          return isSender
            ? typeId === 1 || typeName.includes("sender")
            : typeId === 2 || typeName.includes("receiver");
        });

        // Determine specific phone from shipment
        const specificPhone = isSender
         ? pick(shipment, ["sender_phone", "shipper_phone", "sender_mobile"], "")
         : pick(shipment, ["receiver_phone", "consignee_phone", "receiver_mobile"], "");

        const chosen =
          matchByNameAndPhone(name, specificPhone, roleFiltered) || 
          matchByNameAndPhone(name, specificPhone, list) ||
          roleFiltered[0] ||
          list[0] ||
          null;

        if (chosen) return extractParty(chosen);
      }

      // 4. Fallback: Use raw strings from Shipment
      const address = isSender
        ? pick(
            shipment,
            ["sender_address", "shipper_address", "sender_addr"],
            ""
          )
        : pick(
            shipment,
            ["receiver_address", "consignee_address", "receiver_addr"],
            ""
          );

      const phone = isSender
        ? pick(shipment, ["sender_phone", "shipper_phone", "sender_mobile"], "")
        : pick(
            shipment,
            ["receiver_phone", "consignee_phone", "receiver_mobile"],
            ""
          );

      const email = isSender
        ? pick(shipment, ["sender_email", "shipper_email"], "")
        : pick(shipment, ["receiver_email", "consignee_email"], "");

      const docId = isSender
        ? pick(
            shipment,
            ["sender_document_id", "shipper_document_id", "document_id"],
            ""
          )
        : pick(
            shipment,
            ["receiver_document_id", "consignee_document_id", "document_id"],
            ""
          );

      return extractParty({
        id: null,
        name: name || "—",
        email,
        contact_number: phone, 
        address, 
        city: "",
        postal_code: "",
        district: "",
        state: "",
        country: "",
        document_id: docId,
      });
    };

    let alive = true;
    (async () => {
      const allParties = parsePartyList(await getParties().catch(() => []));
      const [sp, rp] = await Promise.all([
        fetchParty("sender", allParties),
        fetchParty("receiver", allParties),
      ]);
      if (!alive) return;
      setSenderParty(sp);
      setReceiverParty(rp);
    })();

    return () => {
      alive = false;
    };
  }, [shipment]);

  /* --------------- normalized basics --------------- */
  const currency = DEFAULT_CURRENCY;

  /** Build Box Rows (robust) */
  const boxRows = useMemo(() => {
    if (!shipment) return [];

    let boxes = coerceBoxes(shipment.boxes);
    const hasBoxes = Object.keys(boxes).length > 0;

    if (!hasBoxes) {
      const items = Array.isArray(shipment?.items) ? shipment.items : [];
      if (items.length) boxes = groupItemsIntoBoxes(items);
    }

    const keys = Object.keys(boxes).sort((a, b) => Number(a) - Number(b));
    const labelByKey = Object.fromEntries(keys.map((k, i) => [k, `B${i + 1}`]));

    const topWeights = parseBoxWeights(shipment?.box_weight); 
    const rowCount = Math.max(keys.length, topWeights.length, 0);

    const rows = [];
    for (let i = 0; i < rowCount; i++) {
      const k = keys[i]; 
      const box = k ? boxes[k] || {} : {};
      const items = Array.isArray(box?.items) ? box.items : [];

      const boxLevelWeight = Number(box?.box_weight ?? box?.weight ?? 0) || 0;
      const inferredWeightFromItems = sumItemWeights(items);
      const weightCandidate =
        (Number.isFinite(topWeights[i]) ? topWeights[i] : null) ??
        (boxLevelWeight || null) ??
        (inferredWeightFromItems || null) ??
        0;

      rows.push({
        sl: i + 1, 
        boxNo: labelByKey[k] ?? `B${i + 1}`, 
        weight: toFixed3(weightCandidate),
      });
    }
    return rows;
  }, [shipment]);

  /** Items grid */
  const items = useMemo(() => {
    // Robust weight picker - prioritize direct property
    const getW = (it) => {
        if (it?.weight !== undefined && it?.weight !== null && String(it.weight).trim() !== "") {
            return it.weight;
        }
        return pick(it, ["weight_kg", "unit_weight", "item_weight", "total_weight", "gross_weight"], "");
    };

    const hasBoxes =
      shipment?.boxes && Object.keys(coerceBoxes(shipment.boxes)).length > 0;
    if (hasBoxes) {
      const bx = coerceBoxes(shipment.boxes);
      const keys = Object.keys(bx).sort((a, b) => Number(a) - Number(b));
      const labelByKey = Object.fromEntries(
        keys.map((k, i) => [k, `B${i + 1}`])
      );
      const out = [];
      let runningIndex = 1;
      for (const k of keys) {
        const box = bx[k] || {};
        const list = Array.isArray(box?.items) ? box.items : [];
        for (const it of list) {
          const qty =
            it?.piece_no ?? it?.qty ?? it?.quantity ?? it?.pieces ?? "";
          out.push({
            idx: runningIndex++,
            name: it?.name ?? it?.description ?? "Item",
            qty,
            weight: getW(it),
            boxLabel:
              labelByKey[String(it?.box_number ?? it?.box_no ?? k)] ??
              `B${Number(k) || String(k)}`,
          });
        }
      }
      return out;
    }

    const raw = Array.isArray(shipment?.items) ? shipment.items : [];
    return raw.map((it, i) => {
      const qty =
        it?.qty ??
        it?.no_of_pieces ??
        it?.quantity ??
        it?.pieces ??
        it?.count ??
        it?.piece_no ??
        "";
      const rawBox =
        it?.box_number ?? it?.box_no ?? it?.box ?? it?.package_no ?? "";
      const boxLabel = rawBox ? `B${Number(rawBox) || String(rawBox)}` : "";
      return {
        idx: i + 1,
        name: pick(
          it,
          ["description", "name", "item_name", "cargo_name", "title", "item"],
          "Item"
        ),
        qty,
        weight: getW(it),
        boxLabel,
      };
    });
  }, [shipment]);

  const getName = (p, side, sh) =>
    p?.original_name ||
    p?.name ||
    sh?.[side]?.name ||
    sh?.[side] ||
    sh?.[side === "sender" ? "shipper_name" : "consignee_name"] ||
    "";

  const getAddress = (p, side, sh, pickFn) =>
    p?.address ||
    pickFn?.(sh?.[side], ["address"], "") ||
    pickFn?.(
      sh,
      side === "sender"
        ? ["sender_address", "shipper_address", "sender_addr"]
        : ["receiver_address", "consignee_address", "receiver_addr"],
      ""
    );

  const getPhone = (p, side, sh, pickFn) =>
    p?.phones ||
    pickFn?.(sh?.[side], ["contact_number", "whatsapp_number"], "") ||
    [ 
      pickFn?.(sh, side === "sender" 
          ? ["sender_phone", "shipper_phone", "sender_mobile"] 
          : ["receiver_phone", "consignee_phone", "receiver_mobile"], ""),
      pickFn?.(
        sh,
        side === "sender"
          ? ["sender_whatsapp_number"]
          : ["receiver_whatsapp_number"],
        ""
      ),
    ]
      .filter(Boolean)
      .join(" / ");

  const ROWS_PER_COL = 15;

  // --- DIRECT from API fields ---
  const num = (v) =>
    v === null || v === undefined || v === ""
      ? 0
      : Number(String(v).replace(/,/g, "")) || 0;

  const subtotal = num(
    pickNum(shipment, [
      "amount_total_weight",
      "charges.amount_total_weight",
      "total_cost", 
      "subtotal", 
      "summary.subtotal", 
    ])
  );

  const bill = num(
    pickNum(shipment, ["bill_charges", "summary.bill_charges", "charges.bill"])
  );
  const tax = num(
    pickNum(shipment, ["vat_cost", "vat_amount", "summary.vat_cost"])
  );
  const total = num(
    pickNum(shipment, [
      "total_amount", 
      "net_total", 
      "grand_total", 
      "summary.total",
    ])
  );

  if (loading)
    return <div className="p-6 text-slate-600">Loading invoice…</div>;
  if (err) return <div className="p-6 text-rose-700">{err}</div>;
  if (!shipment)
    return <div className="p-6 text-rose-700">No cargo found.</div>;

  const totalWeightDisplay = toFixed3(
    pick(shipment, ["total_weight", "weight", "gross_weight"], 0)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
       @media print {
  @page {
    size: A4 portrait;
    margin: 5mm;
  }

  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  #invoice-sheet {
    width: 190mm !important;
    min-height: 277mm !important;
    page-break-after: always;
    margin: 0 auto !important;
  }

  .page-break {
    break-after: page;
  }

  table tr, table td, table th {
    page-break-inside: avoid !important;
  }
}
      `}</style>

     {!modal && (
  <div className="sticky top-0 z-10 border-b bg-white print:hidden">
    <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2">
      <button
        onClick={() => window.history.back()}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        ← Back
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => generateInvoicePDF(shipment)}
          className="rounded-lg bg-black px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Download PDF
        </button>
      </div>
    </div>
  </div>
)}


      <main className="flex justify-center items-center mx-auto max-w-5xl p-4 invoice-main-section">
        <div
          id="invoice-sheet"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm uppercase"
        >
          {/* Header */}
          <div className="px-1 pt-1">
            <div className="grid grid-cols-3 items-start">
              {/* LEFT: Logo + Branch + Address */}
              <div className="invoice-logo">
                <img
                  src={branch?.logo_url || InvoiceLogo}
                  alt={branch?.branch_name || "Gulf Cargo"}
                  className="h-12 object-contain"
                />
                <div className="header-invoice-address mt-0.5 text-[11px] text-slate-600 normal-case">
                  {s(branch?.branch_address, "")}
                </div>
              </div>

              {/* MIDDLE: QR */}
   <div className="invoice-qrcode flex flex-col items-center justify-center">
  <img
    src={buildQrUrl(qrTargetUrl, 120)}
    alt="Invoice QR"
    className="h-28 w-28 rounded bg-white p-1 ring-1 ring-slate-200"
  />

</div>


              {/* RIGHT: Arabic name + Phone + Email */}
              <div className="text-center sm:text-right">
                <div className="text-[11px] font-semibold leading-tight text-indigo-900">
                  <div className="header-invoice-branch-name mt-1 text-slate-700">
                    {branch?.branch_name ||
                      pick(
                        shipment,
                        [
                          "branch",
                          "branch_name",
                          "branch_label",
                          "branch.name",
                          "origin_branch_name",
                          "origin_branch",
                        ],
                        "—"
                      )}
                  </div>
                </div>
                <div className="header-invoice-branch-arname">
                  {s(branch?.branch_name_ar, "NILL")}
                </div>
                <p className="header-invoice-branch-contact mt-1 font-medium text-slate-800">
                  {pickPhoneFromBranch(branch)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 items-center gap-2 rounded bg-rose-600 px-2 py-1 text-white sm:grid-cols-3">
              <div className="">
                <div className="invoice-top-header">
                  VAT NO. : {COMPANY.vatNo}
                </div>
                <div className="invoice-top-header">
                  SHIPMENT TYPE:{" "}
                  {pick(
                    shipment,
                    ["shipping_method", "method"],
                    COMPANY.defaultShipmentType
                  )}
                </div>
               
              </div>
              <div className="text-center">
                <div className="invoice-top-header">فاتورة ضريبة مبسطة</div>
                <div className="invoice-top-header">SIMPLIFIED TAX INVOICE</div>
              </div>
              <div className="text-right text-xs">
                <div className="invoice-top-header">
                  <div className="tracking-invoice-content-track-no">
                    {getTrackCode(shipment) || "—"}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-1 text-white font-semibold tracking-wide">
                    <span className="invoice-number-text">{billNo}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

         <div
  className="
    section-three-bg
    grid gap-6 border-slate-200 px-1 py-2
    grid-cols-1
    md:grid-cols-[1fr_2fr_1fr]
    print:grid-cols-[1fr_2fr_1fr]
    font-bold text-black
  "
>
            {/* SHIPPER */}
            <div className="flex flex-col rounded-sm bg-white">
              <div className="bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Shipper
              </div>

              <div className="flex-1 pt-2 text-[9px] leading-tight space-y-1">
                <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">Name</div>
                  <div className="mr-1">:</div>
                  <div className="font-semibold text-slate-900 break-words flex-1">
                    {getName(senderParty, "sender", shipment) || "—"}
                  </div>
                </div>

                <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">ID No</div>
                  <div className="mr-1">:</div>
                  <div className="break-words flex-1">
                    {senderParty?.document_id ||
                      pick(shipment, ["sender_document_id", "shipper_document_id"], "—")}
                  </div>
                </div>

                <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">Tel</div>
                  <div className="mr-1">:</div>
                  <div className="break-words flex-1">
                    {getPhone(senderParty, "sender", shipment, pick) || "—"}
                  </div>
                </div>

                <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">No. of Pcs</div>
                  <div className="mr-1">:</div>
                  <div className="break-words flex-1">
                    {computePieces(shipment, boxRows, items)}
                  </div>
                </div>

                <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">Weight</div>
                  <div className="mr-1">:</div>
                  <div className="break-words flex-1">
                    {totalWeightDisplay} kg
                  </div>
                </div>

                 <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">Date</div>
                  <div className="mr-1">:</div>
                  <div className="break-words flex-1">
                    {pickShipmentDate(shipment) || "—"}
                  </div>
                </div>

                 <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">PAYMENT:{" "}</div>
                  <div className="mr-1">:</div>
                  <div className="break-words flex-1">
                    {pick(shipment, ["payment_type", "payment_method", "payment_mode"], "—")}
                  </div>                
                </div>

              </div>
            </div>

            {/* CONSIGNEE */}
            <div className="flex flex-col rounded-sm  bg-white">
              <div className="bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Consignee
              </div>

              <div className="flex-1 pt-2 text-[9px] leading-tight space-y-1">
                <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">Name</div>
                  <div className="mr-1">:</div>
                  <div className="font-semibold text-slate-900 break-words flex-1">
                    {getName(receiverParty, "receiver", shipment) || "—"}
                  </div>
                </div>

                <div className="flex items-baseline">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">Address</div>
                  <div className="mr-1">:</div>
                  <div className="break-words flex-1 whitespace-pre-wrap">
                    {receiverParty?.address_line ||
                      getAddress(receiverParty, "receiver", shipment, pick) ||
                      "—"}
                  </div>
                </div>

                 {/* Post + PIN */}
                <div className="flex items-baseline">
                   <div className="w-14 shrink-0 text-slate-600 font-medium">Post</div>
                   <div className="mr-1">:</div>
                   <div className="flex flex-wrap items-baseline gap-2 flex-1">
                    <span>
                      {receiverParty?.post || pick(receiverParty?.raw || {}, ["post"], "—")}
                    </span>
                    <span className="text-slate-500 text-[8px]">PIN:</span>
                    <span>
                      {receiverParty?.pin ||
                        pick(receiverParty?.raw || {}, ["postal_code", "pincode", "zip"], "—")}
                    </span>
                   </div>
                </div>

                {/* Country/State/Dist/City grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1">
                   <div className="flex items-baseline">
                     <span className="w-10 shrink-0 text-slate-600 font-medium">Country</span>
                     <span className="mr-1">:</span>
                     <span className="truncate">
                        {receiverParty?.country || pick(receiverParty?.raw || {}, ["country"], "—")}
                     </span>
                   </div>
                    <div className="flex items-baseline">
                     <span className="w-8 shrink-0 text-slate-600 font-medium">State</span>
                     <span className="mr-1">:</span>
                     <span className="truncate">
                        {receiverParty?.state || pick(receiverParty?.raw || {}, ["state"], "—")}
                     </span>
                   </div>
                   <div className="flex items-baseline">
                     <span className="w-10 shrink-0 text-slate-600 font-medium">Dist</span>
                     <span className="mr-1">:</span>
                     <span className="truncate">
                        {receiverParty?.dist || pick(receiverParty?.raw || {}, ["district"], "—")}
                     </span>
                   </div>
                   <div className="flex items-baseline">
                     <span className="w-8 shrink-0 text-slate-600 font-medium">City</span>
                     <span className="mr-1">:</span>
                     <span className="truncate">
                        {receiverParty?.city || pick(receiverParty?.raw || {}, ["city"], "—")}
                     </span>
                   </div>
                </div>

                <div className="flex items-baseline pt-1">
                  <div className="w-14 shrink-0 text-slate-600 font-medium">Tel</div>
                  <div className="mr-1">:</div>
                  <div className="break-words flex-1">
                    {getPhone(receiverParty, "receiver", shipment, pick) || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* BOX SUMMARY */}
            <div className="flex flex-col">
               <div className="w-full overflow-hidden border border-slate-300 rounded-sm">
                <table className="w-full text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-center border-b border-slate-300">
                      <th className="border-r border-slate-300 px-1 py-0.5 font-semibold text-slate-700">Box No.</th>
                      <th className="border-r border-slate-300 px-1 py-0.5 font-semibold text-slate-700">INV No.</th>
                      <th className="px-1 py-0.5 font-semibold text-slate-700">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boxRows.length > 0 ? (
                      boxRows.map((row, idx) => (
                        <tr key={idx} className="text-center border-b border-slate-200 last:border-0">
                          <td className="border-r border-slate-200 px-1 py-0.5">
                            {row.boxNo}
                          </td>
                          <td className="border-r border-slate-200 px-1 py-0.5">
                            {billNo}
                          </td>
                          <td className="px-1 py-0.5">
                            {row.weight}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-2 py-2 text-center text-slate-400 italic" colSpan={3}>
                          No box weights
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <section className="px-1 py-1 avoid-break">
  <div className="flex justify-between items-center my-1">
    <div className="invoice-cargo-heading">Cargo Items</div>
    <div className="invoice-weight-text">
      Total Weight: {totalWeightDisplay} kg
    </div>
  </div>

  {(() => {
    // ----------------- CHANGED: STRUCTURED ITEMS WITH BOX HEADERS -----------------
    const structuredRows = [];
    let currentBox = null;

    items.forEach((item) => {
       const itemBox = item.boxLabel || "Unboxed";
       // If box changes, add a header row first
       if(itemBox !== currentBox) {
         currentBox = itemBox;
         structuredRows.push({ isHeader: true, title: `Box ${currentBox.replace('B','')}` });
       }
       // Add the actual item
       structuredRows.push(item);
    });

    // We slice the *structured* rows (headers + items) to respect page limits
    const LEFT_ROWS = 25;
    const RIGHT_ROWS = 20;

    const leftRows = structuredRows.slice(0, LEFT_ROWS);
    const rightRows = structuredRows.slice(LEFT_ROWS, LEFT_ROWS + RIGHT_ROWS);

    // Fillers if needed (just for visual height consistency)
    const leftFillers = Array.from({
      length: Math.max(0, LEFT_ROWS - leftRows.length),
    });
    const rightFillers = Array.from({
      length: Math.max(0, RIGHT_ROWS - rightRows.length),
    });

    const renderRow = (row, idx, prefix) => {
        if(row.isHeader) {
            return (
                <tr key={`${prefix}-HEAD-${idx}`} className="bg-slate-100">
                    <td colSpan={4} className="border border-slate-800 px-2 font-bold text-slate-800">
                        {row.title}
                    </td>
                </tr>
            );
        }
        return (
            <tr key={`${prefix}-${idx}`}>
                <td className="border border-slate-800 text-center">{row.idx}</td>
                <td className="border border-slate-800 uppercase pl-2">{row.name}</td>
                <td className="border border-slate-800 text-center">{row.qty}</td>
                <td className="border border-slate-800 text-center">{row.weight}</td>
            </tr>
        );
    };

    return (
      <div className="grid grid-cols-2 gap-3">

        {/* ---------------- LEFT TABLE ---------------- */}
        <table className="items-table w-full table-fixed border-collapse text-[10px] print-avoid">
          <colgroup>
            <col style={{ width: "30px" }} />
            <col />
            <col style={{ width: "40px" }} />
            <col style={{ width: "50px" }} />
          </colgroup>

          <thead>
            <tr className="text-center">
              <th className="border border-slate-800">SL</th>
              <th className="border border-slate-800 text-left pl-2">ITEMS</th>
              <th className="border border-slate-800">QTY</th>
              <th className="border border-slate-800">WEIGHT</th>
            </tr>
          </thead>

          <tbody>
            {leftRows.map((row, idx) => renderRow(row, idx, 'LEFT'))}
            {leftFillers.map((_, i) => (
              <tr key={`LEFT-FILL-${i}`}>
                <td className="border border-slate-800">&nbsp;</td>
                <td className="border border-slate-800">&nbsp;</td>
                <td className="border border-slate-800">&nbsp;</td>
                <td className="border border-slate-800">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ---------------- RIGHT TABLE ---------------- */}
        <table className="items-table w-full table-fixed border-collapse text-[10px] print-avoid">
          <colgroup>
             <col style={{ width: "30px" }} />
            <col />
            <col style={{ width: "40px" }} />
            <col style={{ width: "50px" }} />
          </colgroup>

          <thead>
            <tr className="text-center">
              <th className="border border-slate-800">SL</th>
              <th className="border border-slate-800 text-left pl-2">ITEMS</th>
              <th className="border border-slate-800">QTY</th>
              <th className="border border-slate-800">WEIGHT</th>
            </tr>
          </thead>

          <tbody>
             {rightRows.map((row, idx) => renderRow(row, idx, 'RIGHT'))}
            {rightFillers.map((_, i) => (
              <tr key={`RIGHT-FILL-${i}`}>
                <td className="border border-slate-800">&nbsp;</td>
                <td className="border border-slate-800">&nbsp;</td>
                <td className="border border-slate-800">&nbsp;</td>
                <td className="border border-slate-800">&nbsp;</td>
              </tr>
            ))}
          </tbody>

          {/* ----------- TOTALS ----------- */}
          <tfoot>
            <tr>
              <td
                className="border border-slate-800 text-right font-medium"
                colSpan={3}
              >
                <div className="flex justify-between px-2">
                  <span>Total</span>
                  <span className="ml-2 text-right">المجموع</span>
                </div>
              </td>
              <td className="border border-slate-800 text-right pr-1">
                {fmtMoney(subtotal, currency).replace(/[A-Z]{3}\s?/, "").trim()}
              </td>
            </tr>

            <tr>
              <td
                className="border border-slate-800 text-right font-medium"
                colSpan={3}
              >
                <div className="flex justify-between px-2">
                  <span>Bill Charges</span>
                  <span className="ml-2 text-right">رسوم الفاتورة</span>
                </div>
              </td>
              <td className="border border-slate-800 text-right pr-1">
                {fmtMoney(bill, currency).replace(/[A-Z]{3}\s?/, "").trim()}
              </td>
            </tr>

            <tr>
              <td
                className="border border-slate-800 text-right font-medium"
                colSpan={3}
              >
                <div className="flex justify-between px-2">
                  <span>VAT %</span>
                  <span className="ml-2 text-right">ضريبة القيمة المضافة %</span>
                </div>
              </td>
              <td className="border border-slate-800 text-right pr-1">
                {fmtMoney(tax, currency).replace(/[A-Z]{3}\s?/, "").trim()}
              </td>
            </tr>

            <tr className="font-semibold">
              <td
                className="border border-slate-800 text-right uppercase"
                colSpan={3}
              >
                <div className="flex justify-between px-2">
                  <span>Net Total</span>
                  <span className="ml-2 text-right">المجموع الصافي</span>
                </div>
              </td>
              <td className="border border-slate-800 text-right pr-1">
                {fmtMoney(total, currency).replace(/[A-Z]{3}\s?/, "").trim()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  })()}
</section>


          {/* Footer */}
          <div className="border-t border-slate-200 px-1 py-2 mt-4">
            <div className="invoice-footer-header flex justify-between px-10 py-2 invoice-terms-conditions-header">
              <div>TERMS AND CONDITIONS </div>
              <div>Thank you for your business.</div>
            </div>

            <div className="invoice-terms-conditions-content">
              <h2>
                Accept the goods only after checking and confirming them on
                delivery.
              </h2>
              <p className="mt-1">
                NO GUARANTEE FOR GLASS/BREAKABLE ITEMS. COMPANY NOT RESPONSIBLE
                FOR ITEMS RECEIVED IN DAMAGED CONDITION. COMPLAINTS WILL NOT BE
                ACCEPTED AFTER 2 DAYS FROM THE DATE OF DELIVERY. COMPANY NOT
                RESPONSIBLE FOR OCTROI CHARGES OR ANY OTHER CHARGES LEVIED
                LOCALLY. IN CASE OF CLAIM (LOSS), PROOF OF DOCUMENTS SHOULD BE
                PRODUCED. SETTLEMENT WILL BE MADE (20 SAR/KGS) PER COMPANY
                RULES. COMPANY WILL NOT TAKE RESPONSIBILITY FOR NATURAL CALAMITY
                AND DELAY IN CUSTOMS CLEARANCE.
              </p>
              <p className="mt-1">
                الشروط: 1. لا توجد مطالب ضد الشركة الناشئة للخسائر الناتجة عن
                الحوادث الطبيعية أو تأخير التخليص الجمركي. 2. لا تتحمل الشركة
                مسؤولية أي خسارة ناتجة عن سوء الاستخدام أو الأضرار غير المسؤولة
                أو المسؤوليات المترتبة على أي رسوم ومعاملات تفرض من قبل السلطات
                الجمركية. 3. الشركة غير مسؤولة عن أي مسؤوليات قانونية ناشئة عن
                المستندات المفقودة أو التالفة. 4. يتحمل المستلم أو المشتري جميع
                الرسوم الإضافية، بما في ذلك رسوم التخزين والغرامات المفروضة من
                قبل الجمارك.
              </p>
              <p className="mt-1">
                ഡെലിവറി ചെയ്യുമ്പോൾ സാധനങ്ങൾ പരിശോധിച്ച് ഉറപ്പ് വരുത്തിയതിന്
                ശേഷം മാത്രം സ്വീകരിക്കുക.
              </p>
            </div>

            <div className="flex justify-around py-2 invoice-terms-conditions-footer">
              <div>Shipper Signature</div>
              <div>Consignee Signature</div>
              <div>Manager Signature</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}