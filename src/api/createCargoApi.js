import axiosInstance from "./axiosInstance";

/* ---------- small helpers ---------- */
const safeString = (v, def = "") => (v === null || v === undefined ? def : String(v));
const safeNumStr = (v, decimals = 2) => {
  const n = Number(String(v ?? 0).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n.toFixed(decimals) : Number(0).toFixed(decimals);
};
const safeWeightStr = (v) => {
  const n = Number(String(v ?? 0).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
};

function buildErrorFromAxios(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const serverMsg = data?.message || data?.msg || data?.error || null;
  let message = `Request failed${status ? ` (${status})` : ""}`;
  if (serverMsg) message += ` - ${serverMsg}`;

  if (data && typeof data === "object") {
    const errs = data.errors ?? data;
    if (errs && typeof errs === "object") {
      try {
        const flat = Object.entries(errs)
          .map(([k, v]) => (Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${JSON.stringify(v)}`))
          .slice(0, 10)
          .join(" | ");
        if (flat) message += ` — ${flat}`;
      } catch (e) {
        /* ignore */
      }
    }
  }

  const out = new Error(message);
  out.status = status;
  out.response = err?.response;
  return out;
}

/* ---------- flatten grouped boxes -> items ---------- */
function flattenBoxesToItems(boxesObj = {}) {
  if (!boxesObj || typeof boxesObj !== "object") return [];
  const items = [];
  Object.keys(boxesObj)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((boxKey) => {
      const arr = Array.isArray(boxesObj[boxKey]?.items) ? boxesObj[boxKey].items : [];
      arr.forEach((it, i) => {
        const pieces = Number(it.piece_no ?? it.pieces ?? it.qty ?? 0) || 0;
        const unit = Number(it.unit_price ?? it.unitPrice ?? it.price ?? 0) || 0;
        const weight = Number(it.weight ?? 0) || 0;
        items.push({
          name: safeString(it.name),
          piece_no: String(pieces),
          qty: String(pieces),
          pieces: String(pieces),
          unit_price: safeNumStr(unit, 2),
          unitPrice: safeNumStr(unit, 2),
          price: safeNumStr(unit, 2),
          total_price: safeNumStr(pieces * unit, 2),
          total: safeNumStr(pieces * unit, 2),
          amount: safeNumStr(pieces * unit, 2),
          weight: safeWeightStr(weight),
          box_number: safeString(it.box_number ?? boxKey),
          slno: safeString(it.slno ?? i + 1),
        });
      });
    });
  return items;
}

/* ---------- build request body ---------- */
async function createCargo(body = {}) {
  const endpoints = ["/cargo", "/cargos", "/public/api/cargo", "/public/api/cargos"];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const { data } = await axiosInstance.post(ep, body, {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      });
      return data?.data ?? data ?? {};
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (status === 422) {
        throw buildErrorFromAxios(err);
      }
    }
  }
  if (lastErr) throw buildErrorFromAxios(lastErr);
  throw new Error("createCargo failed (no response)");
}

/* ---------- build request body (used by Create and Edit) ---------- */
function buildCargoPayload(currentForm, currentBoxes, derivedValues, totalWeight) {
  const { subtotal, billCharges, rows: R } = derivedValues;
  const totalWeightVal = Number(totalWeight.toFixed(3));
  const vatPercentageVal = Number(currentForm.vatPercentage || 0);
  const vatCostVal = Number(((subtotal * vatPercentageVal) / 100).toFixed(2));
  const totalAmount = derivedValues.totalAmount + vatCostVal;

  // ---- build payload ----
  const grouped = {};
  currentBoxes.forEach((box, bIdx) => {
    const bn = String(box.box_number ?? bIdx + 1);
    const numericWeight = Number(box.box_weight ?? box.weight ?? 0);
    const boxWeightNum = Number.isFinite(numericWeight) ? Math.max(0, numericWeight) : 0;
    if (!grouped[bn]) grouped[bn] = { items: [] };
    let putWeightOnFirstItem = true;
    (box.items || []).forEach((it) => {
      const pieces = Number(it.pieces || 0);
      const itemWeight = putWeightOnFirstItem ? boxWeightNum : 0;
      putWeightOnFirstItem = false;
      grouped[bn].items.push({
        slno: String(grouped[bn].items.length + 1),
        box_number: bn,
        name: it.name || "",
        piece_no: String(pieces),
        unit_price: "0.00",
        total_price: "0.00",
        weight: itemWeight.toFixed(3),
      });
    });
  });
  const ordered = {};
  Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).forEach((k) => (ordered[k] = grouped[k]));

  const flatItems = [];
  currentBoxes.forEach((box, bIdx) => {
    const bn = String(box.box_number ?? bIdx + 1);
    const boxW = Number(box.box_weight ?? box.weight ?? 0) || 0;
    const list = Array.isArray(box.items) && box.items.length ? box.items : [{ name: "", pieces: 0 }];
    let putWeightOnFirst = true;
    list.forEach((it, i) => {
      const name = (it.name && String(it.name).trim()) || `Box ${bn} contents`;
      const pcs = Number.isFinite(Number(it.pieces)) ? Number(it.pieces) : 0;
      flatItems.push({
        slno: String(i + 1),
        box_number: bn,
        name,
        piece_no: String(pcs),
        unit_price: "0.00",
        total_price: "0.00",
        weight: (putWeightOnFirst ? boxW : 0).toFixed(3),
      });
      putWeightOnFirst = false;
    });
  });

  const boxWeights = [...currentBoxes]
    .sort((a, b) => Number(a.box_number ?? 0) - Number(b.box_number ?? 0))
    .map((box) => {
      const w = Number(box.box_weight ?? box.weight ?? 0);
      const wn = Number.isFinite(w) ? Math.max(0, w) : 0;
      return wn.toFixed(3);
    });

  const payload = {
    branch_id: Number(currentForm.branchId),
    booking_no: currentForm.invoiceNo,
    sender_id: Number(currentForm.senderId),
    receiver_id: Number(currentForm.receiverId),
    shipping_method_id: Number(currentForm.shippingMethodId),
    payment_method_id: Number(currentForm.paymentMethodId),
    status_id: Number(currentForm.statusId),
    date: currentForm.date,
    time: currentForm.time,
    collected_by: currentForm.collectedByRoleName || "",
    collected_by_id: Number(currentForm.collectedByRoleId),
    name_id: Number(currentForm.collectedByPersonId),
    lrl_tracking_code: currentForm.lrlTrackingCode || null,
    delivery_type_id: Number(currentForm.deliveryTypeId),
    special_remarks: currentForm.specialRemarks || null,
    items: flatItems,
    total_cost: +subtotal.toFixed(2),
    vat_percentage: +vatPercentageVal.toFixed(2),
    vat_cost: +vatCostVal.toFixed(2),
    net_total: +totalAmount.toFixed(2),
    total_weight: totalWeightVal,
    box_weight: boxWeights,
    boxes: ordered,
    bill_charges: +billCharges.toFixed(2),
    total_amount: totalAmount,
    no_of_pieces: Number(currentForm.charges.no_of_pieces || 0),
  };

  CHARGE_KEYS.forEach(key => {
    payload[`quantity_${key}`] = R[key].qty;
    payload[`unit_rate_${key}`] = R[key].rate;
    payload[`amount_${key}`] = R[key].amount;
  });

  return payload;
}

/**
 * getCargoById(id)
 * - GET /cargos/:id (tries a couple of likely endpoints)
 */
async function getCargoById(id) {
  if (!id) throw new Error("getCargoById requires id");
  const endpoints = [`/cargos/${id}`, `/cargo/${id}`, `/public/api/cargo/${id}`, `/public/api/cargos/${id}`, `/api/cargo/show/${id}`];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const { data } = await axiosInstance.get(ep, { timeout: 15000 });
      return data?.data ?? data ?? {};
    } catch (err) {
      lastErr = err;
      // try next
    }
  }
  if (lastErr) throw buildErrorFromAxios(lastErr);
  throw new Error("getCargoById failed (no response)");
}

/**
 * listCargos(params) - GET /cargos (tries multiple endpoints)
 */
async function listCargos(params = {}) {
  const endpoints = ["/cargos", "/cargo", "/public/api/cargos", "/public/api/cargo", "/api/cargos"];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const { data: responseData } = await axiosInstance.get(ep, { params, timeout: 20000 });
      return responseData ?? {}; // Return the entire response body from the API
    } catch (err) {
      lastErr = err;
      // try next
    }
  }
  if (lastErr) throw buildErrorFromAxios(lastErr);
  throw new Error("listCargos failed (no response)");
}

/**
 * deleteCargo(id) - DELETE /cargos/:id
 */
async function deleteCargo(id) {
  if (!id) throw new Error("deleteCargo requires id");
  try {
    const { data } = await axiosInstance.delete(`/cargos/${id}`, { timeout: 15000 });
    return data?.data ?? data ?? {};
  } catch (err) {
    throw buildErrorFromAxios(err);
  }
}

/**
 * updateCargoStatus(payload) - PATCH /cargos/status
 */
async function updateCargoStatus(payload = {}) {
  try {
    const { data } = await axiosInstance.patch("/cargos/status", payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });
    return data?.data ?? data ?? {};
  } catch (err) {
    throw buildErrorFromAxios(err);
  }
}

function normalizeCargoToInvoice(raw) {
  const cargo = (raw && raw.cargo) ? raw.cargo : raw || {};

  /* ------------ safe parser: box_weight ------------ */
  const parseBoxWeights = (bw) => {
    if (!bw) return [];

    // array
    if (Array.isArray(bw)) {
      return bw.map((x) => Number(x) || 0);
    }

    // JSON string
    if (typeof bw === "string") {
      try {
        return parseBoxWeights(JSON.parse(bw));
      } catch {
        // CSV "10,20,30"
        if (bw.includes(",")) {
          return bw.split(",").map((s) => Number(s.trim()) || 0);
        }
        const n = Number(bw);
        return Number.isFinite(n) ? [n] : [];
      }
    }

    // object with numeric keys
    if (typeof bw === "object") {
      return Object.keys(bw)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => Number(bw[k]) || 0);
    }

    return [];
  };

  /* ------------ safe parser: boxes ------------ */
  const coerceBoxes = (bx) => {
    if (!bx) return {};
    if (typeof bx === "string") {
      try {
        return coerceBoxes(JSON.parse(bx));
      } catch {
        return {};
      }
    }
    if (Array.isArray(bx)) {
      const out = {};
      bx.forEach((b, i) => (out[String(i + 1)] = b || {}));
      return out;
    }
    if (typeof bx === "object") return bx;
    return {};
  };

  const normalized = {
    id: cargo.id ?? cargo._id ?? cargo.cargo_id ?? null,

    booking_no:
      cargo.booking_no ??
      cargo.invoice_no ??
      cargo.bookingNo ??
      cargo.booking_number ??
      cargo.invoice_number ??
      "",

    track_code:
      cargo.track_code ??
      cargo.lrl_tracking_code ??
      cargo.tracking_code ??
      cargo.trackCode ??
      "",

    date: cargo.date,
    booking_date: cargo.booking_date,
    shipment_date: cargo.shipment_date,
    invoice_date: cargo.invoice_date,
    created_at: cargo.created_at,

    total_cost: cargo.total_cost ?? cargo.net_total ?? cargo.total ?? 0,
    bill_charges: cargo.bill_charges ?? cargo.bill ?? 0,
    vat_cost: cargo.vat_cost ?? cargo.tax ?? cargo.vat ?? 0,
    no_of_pieces:
      raw.no_of_pieces ??
      cargo.no_of_pieces ??
      cargo.charges?.no_of_pieces ??
      (Array.isArray(cargo.boxes) ? cargo.boxes.length : 0),

    net_total: cargo.net_total ?? cargo.total_cost ?? cargo.total ?? 0,
    total_weight: cargo.total_weight ?? cargo.weight ?? cargo.gross_weight ?? 0,

    payment_method:
      cargo.payment_method ??
      cargo.payment_method_id ??
      cargo.paymentMethod ??
      "",

    delivery_type:
      cargo.delivery_type ??
      cargo.delivery_type_id ??
      cargo.deliveryType ??
      "",

    shipping_method:
      cargo.method ??
      cargo.shipping_method ??
      cargo.shippingMethod?.name ??
      "",

    branch:
      cargo.branch ??
      cargo.branch_name ??
      cargo.branchLabel ??
      "",

    sender:
      cargo.sender ??
      cargo.sender_name ??
      cargo.shipper_name ??
      cargo.shipper ??
      null,
    sender_id:
      cargo.sender_id ??
      cargo.senderId ??
      cargo.shipper_id ??
      cargo.shipperId ??
      null,
    sender_party_id: cargo.sender_party_id ?? cargo.senderPartyId ?? null,
    sender_address:
      cargo.sender_address ??
      cargo.shipper_address ??
      cargo.senderAddress ??
      cargo.shipperAddress ??
      "",
    sender_phone:
      cargo.sender_phone ??
      cargo.sender_mobile ??
      cargo.shipper_phone ??
      cargo.senderPhone ??
      cargo.shipperPhone ??
      "",
    sender_email:
      cargo.sender_email ??
      cargo.senderEmail ??
      cargo.shipper_email ??
      "",

    receiver:
      cargo.receiver ??
      cargo.consignee_name ??
      cargo.receiver_name ??
      cargo.consignee ??
      cargo.consigneeName ??
      null,
    receiver_id:
      cargo.receiver_id ??
      cargo.receiverId ??
      cargo.consignee_id ??
      cargo.consigneeId ??
      null,
    receiver_party_id: cargo.receiver_party_id ?? cargo.receiverPartyId ?? null,
    receiver_address:
      cargo.receiver_address ??
      cargo.consignee_address ??
      cargo.receiverAddress ??
      cargo.consigneeAddress ??
      "",
    receiver_phone:
      cargo.receiver_phone ??
      cargo.consignee_phone ??
      cargo.receiver_mobile ??
      cargo.receiverPhone ??
      cargo.consigneePhone ??
      "",
    receiver_email:
      cargo.receiver_email ??
      cargo.consignee_email ??
      cargo.receiverEmail ??
      cargo.consigneeEmail ??
      "",
    receiver_pincode:
      cargo.receiver_pincode ??
      cargo.consignee_pincode ??
      cargo.postal_code ??
      cargo.zip ??
      cargo.postalCode ??
      "",

    _raw: cargo,
  };

  /* ------------ FIX: add box_weight to normalized -------------- */
  normalized.box_weight = parseBoxWeights(cargo.box_weight);

  /* ------------ FIX: add boxes to normalized ------------------- */
  normalized.boxes = coerceBoxes(cargo.boxes);

  /* ------------ FIX: build items properly ---------------------- */
  const items = [];

  if (Array.isArray(cargo.items)) {
    // API already gave items array
    normalized.items = cargo.items;
  } else {
    Object.keys(normalized.boxes).forEach((boxNum) => {
      const box = normalized.boxes[boxNum];
      const boxItems = Array.isArray(box?.items) ? box.items : [];

      boxItems.forEach((it) => {
        items.push({
          description: it.name || it.description || "",
          qty: it.piece_no ?? it.pieces ?? it.qty ?? "",
          unit_price: it.unit_price ?? it.rate ?? "",
          total_price: it.total_price ?? it.amount ?? "",
          weight: it.weight ?? "",
          box_number: it.box_number ?? boxNum,
        });
      });
    });

    normalized.items = items;
  }

  return normalized;
}

// --- Invoice helpers ---
function incrementInvoiceString(last = "") {
  // Handles: "INV-000123" -> "INV-000124", "2025/INV/99" -> "2025/INV/100", "99" -> "100"
  if (!last) return "INV-000001";
  const s = String(last).trim();

  // Try suffix-digits pattern
  const m = s.match(/^(.*?)(\d+)$/);
  if (m) {
    const [, prefix, digits] = m;
    const next = String(Number(digits) + 1).padStart(digits.length, "0");
    return `${prefix}${next}`;
  }

  // No trailing digits? start with a default suffix
  return `${s}-000001`;
}

/**
 * getNextInvoiceNo(branchId)
 * Uses GET /cargos?branch_id=... to read the most recent invoice/booking no,
 * then returns the incremented string.
 */
async function getNextInvoiceNo(branchId) {
  // ask backend for the newest one from this branch
  // (tolerant param names; your API may accept per_page/limit & sort/order)
  const params = {
    branch_id: branchId,
    per_page: 1,       // try per_page first
    limit: 1,          // some backends use 'limit'
    sort: "id",        // safest when we don't know the exact sort keys
    order: "desc",
  };

  const res = await listCargos(params); // wraps GET /cargos with params
  // Normalize a single most-recent row from common response shapes
  const row =
    (Array.isArray(res) && res[0]) ||
    (Array.isArray(res?.data) && res.data[0]) ||
    (Array.isArray(res?.items) && res.items[0]) ||
    res;

  const lastNo =
    row?.booking_no ??
    row?.invoice_no ??
    row?.bookingNo ??
    row?.invoice_number ??
    row?.invoiceNo ??
    "";

  return incrementInvoiceString(lastNo);
}

export async function updateCargo(id, payload) {
  if (!id) throw new Error("Cargo ID is required for update.");

  const url = `/cargo/${id}`; // ✅ confirmed endpoint

  try {
    const { data } = await axiosInstance.patch(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });
    return data?.data ?? data ?? {};
  } catch (err) {
    throw err;
  }
}
// bulk status update

const bulkUpdateCargoStatus = updateCargoStatus;

/* ---------- exports ---------- */
const defaultExport = {
  createCargo,
  getCargoById,
  listCargos,
  updateCargo,
  deleteCargo,
  updateCargoStatus,
  normalizeCargoToInvoice,
  bulkUpdateCargoStatus,
  buildCargoPayload,
};

export default defaultExport;

export {
  createCargo,
  getCargoById,
  listCargos,
  deleteCargo,
  updateCargoStatus,
  normalizeCargoToInvoice,
  bulkUpdateCargoStatus,
  getNextInvoiceNo,
  buildCargoPayload,
};
