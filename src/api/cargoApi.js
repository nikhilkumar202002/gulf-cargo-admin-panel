import axiosInstance from "./axiosInstance";

/* -------------------- From createCargoApi.js -------------------- */

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

  const isBranchActive = (b) => {
  const s = String(b?.status ?? "").trim().toLowerCase();
  return s === "1" || s === "active" || s === "true" || s === "yes";
};

const normalizeBranch = (d = {}) => ({
  id: d.id ?? d.branch_id ?? d._id ?? null,
  branch_name: d.branch_name ?? d.name ?? d.title ?? "",
  branch_name_ar: d.branch_name_ar ?? d.name_ar ?? d.ar_name ?? "",
  branch_code: d.branch_code ?? d.code ?? "",
  branch_location: d.branch_location ?? d.location ?? "",
  branch_address: d.branch_address ?? d.address ?? "",
  branch_contact_number: d.branch_contact_number ?? d.contact_number ?? d.phone ?? "",
  branch_alternative_number: d.branch_alternative_number ?? d.alternative_number ?? d.alt_phone ?? "",
  branch_email: d.branch_email ?? d.email ?? "",
  logo_url: d.logo_url ?? d.logo ?? d.logoUrl ?? "",
  branch_website: d.branch_website ?? d.website ?? "",
  status: d.status ?? d.active ?? d.is_active ?? "",
  created_by: d.created_by ?? "",
  created_by_email: d.created_by_email ?? "",
});

  const out = new Error(message);
  out.status = status;
  out.response = err?.response;
  return out;
}

export async function createCargo(body = {}) {
  const endpoints = ["/cargo", "/cargos", "/public/api/cargo", "/public/api/cargos"];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const { data } = await axiosInstance.post(ep, body, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000, // Reduced timeout for better performance
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

export function normalizeCargoToInvoice(raw) {
  const cargo = (raw && raw.cargo) ? raw.cargo : raw || {};

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
    total_cost: cargo.total_cost ?? cargo.net_total ?? cargo.total ?? 0,
    bill_charges: cargo.bill_charges ?? cargo.bill ?? 0,
    vat_cost: cargo.vat_cost ?? cargo.tax ?? cargo.vat ?? 0,
    no_of_pieces: raw.no_of_pieces ?? cargo.no_of_pieces ?? cargo.charges?.no_of_pieces ?? (Array.isArray(cargo.boxes) ? cargo.boxes.length : 0),
    net_total: cargo.net_total ?? cargo.total_cost ?? cargo.total ?? 0,
    total_weight: cargo.total_weight ?? cargo.weight ?? cargo.gross_weight ?? 0,

    payment_method: cargo.payment_method ?? cargo.payment_method_id ?? cargo.paymentMethod ?? "",
    delivery_type: cargo.delivery_type ?? cargo.delivery_type_id ?? cargo.deliveryType ?? "",
    shipping_method: cargo.method ?? cargo.shipping_method ?? cargo.shippingMethod?.name ?? "",
    branch: cargo.branch ?? cargo.branch_name ?? cargo.branchLabel ?? "",

    sender: cargo.sender ?? cargo.sender_name ?? cargo.shipper_name ?? cargo.shipper ?? null,
    sender_id: cargo.sender_id ?? cargo.senderId ?? cargo.shipper_id ?? cargo.shipperId ?? null,
    sender_party_id: cargo.sender_party_id ?? cargo.senderPartyId ?? null,
    sender_address: cargo.sender_address ?? cargo.shipper_address ?? cargo.senderAddress ?? cargo.shipperAddress ?? "",
    sender_phone: cargo.sender_phone ?? cargo.sender_mobile ?? cargo.shipper_phone ?? cargo.senderPhone ?? cargo.shipperPhone ?? "",
    sender_email: cargo.sender_email ?? cargo.senderEmail ?? cargo.shipper_email ?? "",

    receiver:
      cargo.receiver ??
      cargo.consignee_name ??
      cargo.receiver_name ??
      cargo.consignee ??
      cargo.consigneeName ??
      null,
    receiver_id: cargo.receiver_id ?? cargo.receiverId ?? cargo.consignee_id ?? cargo.consigneeId ?? null,
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
      cargo.receiver_pincode ??
      cargo.postal_code ??
      cargo.zip ??
      cargo.postalCode ??
      "",

    _raw: cargo,
  };

  const items = [];
  if (cargo.items && Array.isArray(cargo.items)) {
    cargo.items.forEach(it => items.push(it));
  } else if (cargo.boxes && typeof cargo.boxes === "object") {
    Object.keys(cargo.boxes).forEach(boxNum => {
      const box = cargo.boxes[boxNum];
      const boxItems = (box && box.items) || [];
      boxItems.forEach(it => {
        items.push({
          description: it.name || it.description || "",
          qty: it.piece_no ?? it.pieces ?? it.qty ?? "",
          unit_price: it.unit_price ?? it.unitPrice ?? it.rate ?? "",
          total_price: it.total_price ?? it.amount ?? "",
          weight: it.weight ?? "",
          box_number: it.box_number ?? boxNum,
        });
      });
    });
  } else if (cargo.boxes && Array.isArray(cargo.boxes)) {
    cargo.boxes.forEach(box => {
      (box.items || []).forEach(it => items.push({
        description: it.name || it.description || "",
        qty: it.piece_no ?? it.pieces ?? it.qty ?? "",
        unit_price: it.unit_price ?? it.unitPrice ?? it.rate ?? "",
        total_price: it.total_price ?? it.amount ?? "",
        weight: it.weight ?? "",
        box_number: it.box_number ?? "",
      }));
    });
  }

  normalized.items = items;

  return normalized;
}

async function listCargos(params = {}) {
  try {
    const { data } = await axiosInstance.get("/cargos", { params, timeout: 15000 }); // Reduced timeout
    return data?.data ?? data ?? {};
  } catch (err) {
    throw buildErrorFromAxios(err);
  }
}

function incrementInvoiceString(last = "") {
  if (!last) return "INV-000001";
  const s = String(last).trim();
  const m = s.match(/^(.*?)(\d+)$/);
  if (m) {
    const [, prefix, digits] = m;
    const next = String(Number(digits) + 1).padStart(digits.length, "0");
    return `${prefix}${next}`;
  }
  return `${s}-000001`;
}

export async function getNextInvoiceNo(branchId) {
  const params = {
    branch_id: branchId,
    per_page: 1,
    limit: 1,
    sort: "id",
    order: "desc",
  };

  const res = await listCargos(params);
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

/* -------------------- From other api files -------------------- */

const unwrap = (res) => res?.data ?? res;

const extractArray = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.results)) return d.results;
  if (Array.isArray(d?.branches)) return d.branches;
  return [];
};

const withAuth = (token, cfg = {}) =>
  token
    ? { ...cfg, headers: { ...(cfg.headers || {}), Authorization: `Bearer ${token}` } }
    : cfg;

// from shipmentMethodApi.js
export const getActiveShipmentMethods = (token, axiosOpts = {}) =>
  axiosInstance.get("/shipment-methods", withAuth(token, { ...axiosOpts, params: { status: 1 } })).then(extractArray);

// from shipmentStatusApi.js
export const getActiveShipmentStatuses = (token, axiosOpts = {}) =>
  axiosInstance.get("/shipment-status", withAuth(token, { ...axiosOpts, params: { status: 1 } })).then(extractArray);

// from branchApi.js
export const getBranchUsers = async (branchId, token) => {
  if (!branchId) return [];
  try {
    const res = await axiosInstance.get(`/branches/${branchId}/users`, withAuth(token));
    const data = unwrap(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.users)) return data.users;
    const firstArr = Object.values(data || {}).find(Array.isArray);
    return Array.isArray(firstArr) ? firstArr : [];
  } catch {
    return [];
  }
};
export const viewBranch = async (id, token) =>
  (await axiosInstance.get(`/branch/${id}`, withAuth(token))).data;

// from deliveryType.js
export const getActiveDeliveryTypes = async () => {
  try {
    const response = await axiosInstance.get('/delivery-types?status=1');
    return response.data;
  } catch (error) {
    throw new Error(error.response ? error.response.data.message : error.message);
  }
};

export async function getActiveBranches(token) {
  try {
    // Calls /branches?status=1 directly
    const res = await axiosInstance.get("/branches", withAuth(token, { params: { status: 1 } }));
    return extractArray(res);
  } catch (err) {
    console.error("getActiveBranches Error:", err);
    return [];
  }
}

// from accountApi.js
export const getProfile = async () => unwrap(await axiosInstance.get("/profile"));

// from collectedByApi.js
export async function getActiveCollected() {
  try {
    const { data } = await axiosInstance.get("/collected", { timeout: 10000 }); // Reduced timeout
    return data;
  } catch (err) {
    throw buildErrorFromAxios(err);
  }
}

// from driverApi.js
export const getActiveDrivers = async () => {
  try {
    const { data } = await axiosInstance.get('/drivers?status=1');
    return data;
  } catch (error) {
    throw error;
  }
};

// from partiesApi.js
export const getPartiesByCustomerType = async (customerTypeId, params = {}) => {
  if (customerTypeId == null) throw new Error("customerTypeId is required");
  const res = await axiosInstance.get("/parties", { params });
  const data = res?.data?.data ?? res?.data ?? [];
  const want = Number(customerTypeId);

  const typeIdOf = (p) => {
    const raw =
      p?.customer_type_id ??
      p?.customerTypeId ??
      p?.type_id ??
      p?.typeId ??
      p?.customer_type ??
      p?.type ??
      p?.role;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const n = Number(raw);
      if (!Number.isNaN(n)) return n;
      if (/sender/i.test(raw)) return 1;
      if (/receiver|consignee/i.test(raw)) return 2;
    }
    const obj =
      (p?.customer_type && typeof p.customer_type === "object" ? p.customer_type : null) ||
      (p?.type && typeof p.type === "object" ? p.type : null);
    if (obj) {
      const n = Number(obj.id ?? obj.value ?? obj.code);
      if (!Number.isNaN(n)) return n;
      const nm = String(obj.name ?? obj.title ?? obj.label ?? "");
      if (/sender/i.test(nm)) return 1;
      if (/receiver|consignee/i.test(nm)) return 2;
    }
    return null;
  };

  return data.filter((p) => typeIdOf(p) === want);
};

// from paymentMethod.js
export const getAllPaymentMethods = async () => {
  try {
    const response = await axiosInstance.get("/payment-methods");
    return response.data;
  } catch (error) {
    throw error;
  }
};