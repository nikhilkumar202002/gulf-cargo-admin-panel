// src/pages/InvoiceView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { normalizeCargoToInvoice, getCargoById } from "../api/createCargoApi";
import { getPartyById, getParties } from "../api/partiesApi";
import { getBranchByIdSmart } from "../api/branchApi";
import InvoiceLogo from "../assets/Logo.png";
import { generateInvoicePDF } from "../utils/generateInvoicePDF";
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
    .join(" / ");
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

const buildTrackUrl = (shipment) => {
  const base = "https://gulfcargoksa.com/trackorder/";
  const track = getTrackCode(shipment);
  const box =
    shipment?.box_no || shipment?.booking_no || shipment?.invoice_no || "";
  const params = new URLSearchParams();
  if (track) params.set("code", track);
  if (box) params.set("box", String(box));
  params.set("src", "qr");
  return params.toString() ? `${base}?${params.toString()}` : base;
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
  const trackUrl = buildTrackUrl(shipment);

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
      // This prevents bad lookups if we already have the data from CreateCargo
      const directObj = isSender ? shipment.sender : shipment.receiver;
      if (directObj && typeof directObj === 'object' && directObj.id) {
          // Verify it matches the ID we expect
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

        // Determine specific phone from shipment to ensure we pick the correct "Nikhil"
        const specificPhone = isSender
         ? pick(shipment, ["sender_phone", "shipper_phone", "sender_mobile"], "")
         : pick(shipment, ["receiver_phone", "consignee_phone", "receiver_mobile"], "");

        const chosen =
          matchByNameAndPhone(name, specificPhone, roleFiltered) || // Match specific phone first
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
      // Fetch all parties once to avoid multiple lookups by name
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

  const billNo = useMemo(
    () => shipment?.booking_no ?? shipment?.invoice_no ?? "—",
    [shipment]
  );

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

  const colA = items.slice(0, ROWS_PER_COL);
  const colB = items.slice(ROWS_PER_COL, ROWS_PER_COL * 2);
  while (colA.length < ROWS_PER_COL) colA.push(null);
  while (colB.length < ROWS_PER_COL) colB.push(null);

  if (loading)
    return <div className="p-6 text-slate-600">Loading invoice…</div>;
  if (err) return <div className="p-6 text-rose-700">{err}</div>;
  if (!shipment)
    return <div className="p-6 text-rose-700">No cargo found.</div>;

  const totalWeightDisplay = toFixed3(
    pick(shipment, ["total_weight", "weight", "gross_weight"], 0)
  );

  const ROWS_PER_PAGE = 45;

  const paginatedItems = [];
  for (let i = 0; i < items.length; i += ROWS_PER_PAGE) {
    paginatedItems.push(items.slice(i, i + ROWS_PER_PAGE));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
       @media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
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
    src={buildQrUrl(trackUrl, 120)}
    alt="Invoice QR"
    className="h-28 w-28 rounded bg-white p-1 ring-1 ring-slate-200"
  />

  {/* <div className="tracking-block">
    Tracking No: <strong>{getTrackCode(shipment) || "—"}</strong>
    <br />
    <a href={trackUrl} target="_blank" rel="noopener noreferrer">
      Track Shipment →
    </a>
  </div> */}
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
                  {s(branch?.branch_name_ar, "شركة سواحل الخليج للنقل البحري")}
                </div>
                <p className="header-invoice-branch-contact mt-1 font-medium text-slate-800">
                  {pickPhoneFromBranch(branch)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 items-center gap-2 rounded bg-rose-600 px-2 py-1 text-white sm:grid-cols-3">
              <div className="text-xs">
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
              grid gap-4 border-slate-200 px-1 
              [grid-template-columns:1fr]
              md:[grid-template-columns:1.2fr_2fr_1fr]
            "
          >
            {/* SHIPPER (2fr) */}
            <div className="relative rounded-lg ">
              <div className=" bg-rose-600 px-1 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white w-25 shrink-0">
                Shipper
              </div>

              <div className=" text-[10px] mt-2">
                <div className="flex items-start">
                  <div className="invoice-parties-label w-20 shrink-0 text-slate-700">
                    Name
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text font-semibold text-slate-900">
                    {getName(senderParty, "sender", shipment) || "—"}
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="invoice-parties-label w-20 shrink-0 text-slate-700">
                    ID No
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text">
                    {senderParty?.document_id ||
                      pick(
                        shipment,
                        ["sender_document_id", "shipper_document_id"],
                        "—"
                      )}
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="invoice-parties-label w-20 shrink-0 text-slate-700">
                    Tel
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text">
                    {getPhone(senderParty, "sender", shipment, pick) || "—"}
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="invoice-parties-label w-20 shrink-0 text-slate-700">
                    No. of Pcs
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text">
                    {computePieces(shipment, boxRows, items)}
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="invoice-parties-label w-20 shrink-0 text-slate-700">
                    Weight
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text">
                    {totalWeightDisplay} kg
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="invoice-parties-label w-20 shrink-0 text-slate-700">
                    Date
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text">
                    {pickShipmentDate(shipment) || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* CONSIGNEE (2fr) */}
            <div className="relative rounded-lg ">
              <div className=" bg-rose-600 px-1 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white w-25 shrink-0">
                Consignee
              </div>

              <div className="text-[10px] my-2">
                <div className="flex items-start">
                  <div className="invoice-parties-label w-15 shrink-0 text-slate-700">
                    Name
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text font-semibold text-slate-900">
                    {getName(receiverParty, "receiver", shipment) || "—"}
                  </div>
                </div>

                <div className="flex">
                  <div className="invoice-parties-label w-15 shrink-0 text-slate-700">
                    Adress
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text whitespace-pre-wrap">
                    {receiverParty?.address_line ||
                      getAddress(receiverParty, "receiver", shipment, pick) ||
                      "—"}
                  </div>
                </div>

                {/* Post + PIN on one line */}
                <div className="flex items-start">
                  <div className="invoice-parties-label w-15 shrink-0 text-slate-700">
                    Post
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text flex flex-wrap items-baseline gap-4">
                    <span>
                      {receiverParty?.post ||
                        pick(receiverParty?.raw || {}, ["post"], "—")}
                    </span>
                    <span className="text-slate-700">PIN:</span>
                    <span className="invoice-parties-text">
                      {receiverParty?.pin ||
                        pick(
                          receiverParty?.raw || {},
                          ["postal_code", "pincode", "zip"],
                          "—"
                        )}
                    </span>
                  </div>
                </div>

                {/* Dist + State on one line */}
               <div className="grid grid-cols-3 gap-6 items-start text-[10px]">

  {/* COUNTRY */}
  <div className="flex items-start gap-1">
    <span className="text-slate-700 font-semibold">Country</span>
    <span>:</span>
    <span>
      {receiverParty?.country ||
        pick(receiverParty?.raw || {}, ["country"], "—")}
    </span>
  </div>

  {/* DISTRICT */}
  <div className="flex items-start gap-1">
    <span className="text-slate-700 font-semibold">Dist</span>
    <span>:</span>
    <span>
      {receiverParty?.dist ||
        pick(receiverParty?.raw || {}, ["district"], "—")}
    </span>
  </div>

  {/* STATE */}
  <div className="flex items-start gap-1">
    <span className="text-slate-700 font-semibold">State</span>
    <span>:</span>
    <span>
      {receiverParty?.state ||
        pick(receiverParty?.raw || {}, ["state"], "—")}
    </span>
  </div>

</div>

                          
                <div className="flex items-start">
                  <div className="invoice-parties-label w-15 shrink-0 text-slate-700">
                    Tel
                  </div>
                  <div className="mx-1">:</div>
                  <div className="invoice-parties-text">
                    {getPhone(receiverParty, "receiver", shipment, pick) || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* BOX SUMMARY (1fr) */}
            <div className="self-start">
              <div className="mt-2 ml-auto w-[150px] overflow-hidden ">
                <table className="text-[11px] ">
                  <thead className="box-weight-table-header">
                    <tr className="text-center">
                      <th className="border border-slate-800 px-2 py-1 w-[30px]">
                        S.No
                      </th>
                      <th className="border border-slate-800 px-2 py-1">
                        Box No.
                      </th>
                      <th className="border border-slate-800 px-2 py-1 w-[65px]">
                        Weight
                      </th>
                    </tr>
                  </thead>
                  <tbody className="box-weight-table-body">
                    {boxRows.length > 0 ? (
                      boxRows.map((row, idx) => (
                        <tr key={idx} className="text-center">
                          <td className="border border-slate-800 px-2 py-1">
                            {row.sl}
                          </td>
                          <td className="border border-slate-800 px-2 py-1">
                            {billNo}
                          </td>
                          <td className="border border-slate-800 px-2 py-1">
                            {row.weight}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="border border-slate-800 px-2 py-2 text-center text-slate-500"
                          colSpan={3}
                        >
                          No box weights
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <section className="px-1 py-1">
            <div className="flex justify-between items-center my-1">
              <div className="invoice-cargo-heading">Cargo Items</div>
              <div className="invoice-weight-text">
                Total Weight: {totalWeightDisplay} kg
              </div>
            </div>

            {(() => {
              const LEFT_ROWS = 25;
              const RIGHT_ROWS = 20;

              const leftItems = items.slice(0, LEFT_ROWS);
              const rightItems = items.slice(LEFT_ROWS, LEFT_ROWS + RIGHT_ROWS);

              const leftFillers = Array.from({
                length: LEFT_ROWS - leftItems.length,
              });
              const rightFillers = Array.from({
                length: RIGHT_ROWS - rightItems.length,
              });

              return (
                <div className="grid grid-cols-2 gap-3">
                  {/* ---------------- LEFT TABLE ---------------- */}
                  <table className="items-table w-full table-fixed border-collapse text-[10px]">
                    <colgroup>
                      <col style={{ width: "55px" }} />
                      <col />
                      <col style={{ width: "70px" }} />
                      <col style={{ width: "50px" }} />
                    </colgroup>

                    <thead>
                      <tr className="text-center">
                        <th className="border border-slate-800">SL NO.</th>
                        <th className="border border-slate-800 text-left">
                          ITEMS
                        </th>
                        <th className="border border-slate-800">BOX NO.</th>
                        <th className="border border-slate-800">QTY</th>
                      </tr>
                    </thead>

                    <tbody>
                      {leftItems.map((it, idx) => (
                        <tr key={`LEFT-${idx}`}>
                          <td className="border border-slate-800 text-center">
                            {it.idx}
                          </td>
                          <td className="border border-slate-800 uppercase">
                            {it.name}
                          </td>
                          <td className="border border-slate-800 text-center">
                            {it.boxLabel}
                          </td>
                          <td className="border border-slate-800 text-center">
                            {it.qty}
                          </td>
                        </tr>
                      ))}

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
                  <table className="items-table w-full table-fixed border-collapse text-[10px]">
                    <colgroup>
                      <col style={{ width: "55px" }} />
                      <col />
                      <col style={{ width: "70px" }} />
                      <col style={{ width: "50px" }} />
                    </colgroup>

                    <thead>
                      <tr className="text-center">
                        <th className="border border-slate-800">SL NO.</th>
                        <th className="border border-slate-800 text-left">
                          ITEMS
                        </th>
                        <th className="border border-slate-800">BOX NO.</th>
                        <th className="border border-slate-800">QTY</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rightItems.map((it, idx) => (
                        <tr key={`RIGHT-${idx}`}>
                          <td className="border border-slate-800 text-center">
                            {it.idx}
                          </td>
                          <td className="border border-slate-800 uppercase">
                            {it.name}
                          </td>
                          <td className="border border-slate-800 text-center">
                            {it.boxLabel}
                          </td>
                          <td className="border border-slate-800 text-center">
                            {it.qty}
                          </td>
                        </tr>
                      ))}

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
                          <div className="flex justify-between">
                            <span>Total</span>
                            <span className="ml-2 text-right">المجموع</span>
                          </div>
                        </td>
                        <td className="border border-slate-800 text-right">
                          {fmtMoney(subtotal, currency)
                            .replace(/[A-Z]{3}\s?/, "")
                            .trim()}
                        </td>
                      </tr>

                      <tr>
                        <td
                          className="border border-slate-800 text-right font-medium"
                          colSpan={3}
                        >
                          <div className="flex justify-between">
                            <span>Bill Charges</span>
                            <span className="ml-2 text-right">
                              رسوم الفاتورة
                            </span>
                          </div>
                        </td>
                        <td className="border border-slate-800 text-right">
                          {fmtMoney(bill, currency)
                            .replace(/[A-Z]{3}\s?/, "")
                            .trim()}
                        </td>
                      </tr>

                      <tr>
                        <td
                          className="border border-slate-800 text-right font-medium"
                          colSpan={3}
                        >
                          <div className="flex justify-between">
                            <span>VAT %</span>
                            <span className="ml-2 text-right">
                              ضريبة القيمة المضافة %
                            </span>
                          </div>
                        </td>
                        <td className="border border-slate-800 text-right">
                          {fmtMoney(tax, currency)
                            .replace(/[A-Z]{3}\s?/, "")
                            .trim()}
                        </td>
                      </tr>

                      <tr className="font-semibold">
                        <td
                          className="border border-slate-800 text-right uppercase"
                          colSpan={3}
                        >
                          <div className="flex justify-between">
                            <span>Net Total</span>
                            <span className="ml-2 text-right">
                              المجموع الصافي
                            </span>
                          </div>
                        </td>
                        <td className="border border-slate-800 text-right">
                          {fmtMoney(total, currency)
                            .replace(/[A-Z]{3}\s?/, "")
                            .trim()}
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