import api from "./axios";

// --- HELPERS ---
const unwrap = (res) => res?.data ?? res;

const normalizeList = (res) => {
  const d = unwrap(res);
  if (!d) return [];
  if (Array.isArray(d)) return d;

  // 1. Check specific keys used in your project
  if (Array.isArray(d.branches)) return d.branches;
  if (Array.isArray(d.data?.branches)) return d.data.branches;
  
  // 2. Standard keys
  if (Array.isArray(d.data)) return d.data;
  if (Array.isArray(d.data?.data)) return d.data.data; // Nested pagination
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.results)) return d.results;
  if (Array.isArray(d.list)) return d.list;
  if (Array.isArray(d.roles)) return d.roles;

  // 3. Fallback: Find first array property
  if (typeof d === "object") {
    const firstArr = Object.values(d).find(Array.isArray);
    if (firstArr) return firstArr;
  }
  
  return [];
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
  start_number: d.start_number ?? d.invoice_start_number ?? "",
});

// Roles Api

export const getRoles = async (params = {}) => {
  try {
    const { data } = await api.get("/roles", { params });
    return normalizeList(data);
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return [];
  }
};

export const getActiveRoles = getRoles;

/* ==========================================================================
   BRANCHES (CRUD)
   ========================================================================== */

export const getBranches = async (params = {}) => {

  try {
    const res = await api.get("/branches", { params });
    const raw = unwrap(res);

    if (raw?.current_page && Array.isArray(raw.data)) {
      return {
        items: raw.data.map(normalizeBranch),
        meta: {
          current_page: raw.current_page,
          last_page: raw.last_page,
          total: raw.total,
          per_page: raw.per_page,
        },
      };
    }
    return normalizeList(raw).map(normalizeBranch);
  } catch (e) {
    const res = await api.get("/branch", { params });
    return normalizeList(res).map(normalizeBranch);
  }
};

export const getActiveBranches = async (params = {}) => {
  // Some backends have a dedicated fast endpoint
  try {
    const res = await api.get("/branches", { params: { status: 1, ...params } });
    const list = normalizeList(res).map(normalizeBranch);
    // Double check filtering client-side if backend ignored 'status=1'
    return list.length > 0 ? list : [];
  } catch (e) {
    return [];
  }
};

export const getBranchById = async (id) => {
  if (!id) throw new Error("Branch ID is required");
  
  const endpoints = [`/branch/${id}`, `/branches/${id}`];
  
  for (const ep of endpoints) {
    try {
      const res = await api.get(ep);
      const data = unwrap(res);
      const item = data?.branch ?? data?.data ?? data;
      if (item && (item.id || item.branch_name)) {
         return normalizeBranch(item);
      }
    } catch (e) {
      // continue
    }
  }
  
  // Fallback: find in list
  const all = await getActiveBranches();
  return all.find((b) => String(b.id) === String(id)) || null;
};

// Alias for compatibility
export const getBranchByIdSmart = getBranchById;

export const createBranch = async (payload) => {
  const res = await api.post("/branch", payload);
  return unwrap(res);
};

export const updateBranch = async (id, payload) => {
  const isFormData = payload instanceof FormData;
  if (isFormData) payload.append("_method", "PUT");

  const res = await api.post(`/branch/${id}`, payload);
  return unwrap(res);
};

export const deleteBranch = async (id) => {
  const res = await api.delete(`/branch/${id}`);
  return unwrap(res);
};

export const getBranchUsers = async (branchId) => {
  if (!branchId) return [];
  try {
    const res = await api.get(`/branches/${branchId}/users`);
    return normalizeList(res);
  } catch (e) {
    return [];
  }
};  

/* ==========================================================================
   MASTER DATA (Dropdowns & Settings)
   ========================================================================== */

// --- SHIPMENT METHODS ---
export const getShipmentMethods = async (params = {}) => {
  const res = await api.get("/shipment-methods", { params });
  return normalizeList(res);
};

export const getActiveShipmentMethods = async () => {
  return getShipmentMethods({ status: 1 });
};

export const getInactiveShipmentMethods = async () => {
  return getShipmentMethods({ status: 0 });
};

export const createShipmentMethod = async (data) => {
  const res = await api.post("/shipment-method", data);
  return unwrap(res);
};

// --- SHIPMENT STATUSES ---
export const getShipmentStatuses = async (params = {}) => {
  const res = await api.get("/shipment-status", { params });
  return normalizeList(res);
};
export const createShipmentStatus = async (data) => {
  const res = await api.post("/shipment-status", data);
  return unwrap(res);
};

// --- PORTS ---
export const getPorts = async (params = {}) => {
  const res = await api.get("/ports", { params });
  return normalizeList(res);
};
export const createPort = async (data) => {
  const res = await api.post("/port", data);
  return unwrap(res);
};

// --- VISA TYPES ---
export const getVisaTypes = async (params = {}) => {
  const res = await api.get("/visa-types", { params });
  return normalizeList(res);
};
export const createVisaType = async (data) => {
  const res = await api.post("/visa-type", data);
  return unwrap(res);
};
export const updateVisaType = async (id, data) => {
  const res = await api.put(`/visa-type/${id}`, data);
  return unwrap(res);
};

// --- DRIVERS ---
export const getDrivers = async (params = {}) => {
  const res = await api.get("/drivers", { params });
  return normalizeList(res);
};
export const createDriver = async (data) => {
  const res = await api.post("/driver", data);
  return unwrap(res);
};

// --- PAYMENT METHODS ---
export const getPaymentMethods = async (params = {}) => {
  const res = await api.get("/payment-methods", { params });
  return normalizeList(res);
};
export const createPaymentMethod = async (data) => {
  const res = await api.post("/payment-method", data);
  return unwrap(res);
};

// --- DELIVERY TYPES ---
export const getDeliveryTypes = async (params = {}) => {
  const res = await api.get("/delivery-types", { params });
  return normalizeList(res);
};
export const createDeliveryType = async (data) => {
  const res = await api.post("/delivery-type", data);
  return unwrap(res);
};

// --- COLLECTED BY (Roles) ---
export const getCollectedBy = async () => {
  const res = await api.get("/collected");
  return normalizeList(res);
};
// Alias for compatibility
export const getActiveCollected = getCollectedBy;

// --- LICENSE TYPES ---
export const getLicenseTypes = async (params = {}) => {
  const res = await api.get("/license-types", { params });
  return normalizeList(res);
};
export const createLicenseType = async (data) => {
  const res = await api.post("/license-type", data);
  return unwrap(res);
};

// --- INVOICE NUMBERING PREFIXES ---
export const getInvoiceNumberings = async (params = {}) => {
  const res = await api.get("/invoice-numberings", { params });
  return normalizeList(res);
};
export const createInvoiceNumbering = async (data) => {
  const res = await api.post("/invoice-numbering", data);
  return unwrap(res);
};
export const updateInvoiceNumbering = async (id, data) => {
  const res = await api.put(`/invoice-numbering/${id}`, data);
  return unwrap(res);
};
export const deleteInvoiceNumbering = async (id) => {
  const res = await api.delete(`/invoice-numbering/${id}`);
  return unwrap(res);
};

/* ==========================================================================
   LOCATION / GLOBAL DATA
   ========================================================================== */

export const getDocumentTypes = async (params = {}) => {
  const { data } = await api.get("/document-types", { params });
  return data?.data ?? data ?? [];
};

export const getActiveCustomerTypes = async () => {
  const { data } = await api.get("/customer-types", { params: { status: 1 } });
  return data?.data ?? data ?? [];
};

export const getPhoneCodes = async () => {
  const { data } = await api.get("/phone-codes");
  return data?.data ?? data ?? [];
};

export const getCountries = async () => {
  const { data } = await api.get("/countries");
  return data?.data ?? data ?? [];
};

export const getStatesByCountry = async (countryId) => {
  const { data } = await api.get("/states", { params: { country_id: countryId } });
  return data?.data ?? data ?? [];
};

export const getDistrictsByState = async (stateId) => {
  const { data } = await api.get("/districts", { params: { state_id: stateId } });
  return data?.data ?? data ?? [];
};

export const createRole = async (payload) => {
  const res = await api.post("/roles", payload);
  return unwrap(res);
};
export const updateRole = async (id, payload) => {
  const res = await api.put(`/roles/${id}`, payload);
  return unwrap(res);
};

// (getDocumentTypes exists)
export const createDocumentType = async (payload) => {
  const res = await api.post("/document-type", payload);
  return unwrap(res);
};


