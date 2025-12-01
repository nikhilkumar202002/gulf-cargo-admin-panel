import api from "./axios";

// Helper to unwrap response
const unwrap = (res) => res?.data ?? res;

/**
 * Create a new party (Sender or Receiver)
 * Supports FormData for file uploads automatically via the new axios instance.
 */
export const createParty = async (payload) => {
  const res = await api.post("/party", payload);
  return unwrap(res);
};

/**
 * Update an existing party
 */
export const updateParty = async (id, payload) => {
  if (!id) throw new Error("partyId is required");
  
  // Handle FormData for updates (if files are present)
  // Note: Some backends require POST + _method="PUT" for file updates
  const isFD = payload instanceof FormData;
  const url = `/party/${id}`;
  
  // If it's FormData, we might need to append _method if your backend requires it for PUT
  if (isFD && !payload.has("_method")) {
      payload.append("_method", "PUT");
  }

  // Use POST for FormData updates (common convention), or PUT for JSON
  const method = isFD ? "post" : "post"; // Keeping as post based on your original file
  
  const res = await api[method](url, payload);
  return unwrap(res);
};

/**
 * Get all parties with optional params (search, page, etc.)
 */
export const getParties = async (params = {}) => {
  const res = await api.get("/parties", { params });
  return unwrap(res);
};


export const deleteParty = async (id) => {
  const { data } = await api.delete(`/party/${id}`);
  return data;
};

/**
 * Get parties filtered by type (1=Sender, 2=Receiver)
 * OPTIMIZED: Tries server-side filtering first for speed.
 */
export const getPartiesByCustomerType = async (customerTypeId, params = {}) => {
  if (customerTypeId == null) throw new Error("customerTypeId is required");
  
  // 1. Try Server-Side Filtering (Much Faster)
  const serverParams = { ...params, customer_type_id: customerTypeId };
  const res = await api.get("/parties", { params: serverParams });
  
  const data = res?.data?.data ?? res?.data ?? [];
  
  // 2. If backend ignored the filter (returned mixed types), fallback to Client-Side
  // Check the first few items to see if we need to filter manually
  const needsClientFilter = data.length > 0 && data.some(p => {
      const tId = p.customer_type_id ?? p.customer_type?.id;
      return tId && Number(tId) !== Number(customerTypeId);
  });

  if (needsClientFilter) {
      return data.filter(p => {
          const raw = p.customer_type_id ?? p.customer_type?.id ?? p.type_id;
          return Number(raw) === Number(customerTypeId);
      });
  }

  return data;
};

export const getPartyById = async (id) => {
  if (!id) throw new Error("partyId is required");
  const res = await api.get(`/party/${id}`);
  return res?.data?.data ?? res?.data ?? unwrap(res);
};

/**
 * Flexible ID lookup (handles legacy endpoints)
 */
export async function getPartyByIdFlexible(id) {
  if (!id) return null;
  
  // Try primary endpoint
  try {
    const res = await api.get(`/party/${id}`);
    return res?.data?.data?.party ?? res?.data?.party ?? res?.data?.data ?? res?.data ?? null;
  } catch (e) {
    // Fallback to public endpoint if auth fails or route differs
    try {
        const res2 = await api.get(`/public/api/party/${id}`);
        return res2?.data?.data ?? res2?.data ?? null;
    } catch (e2) {
        console.warn("Failed to fetch party flexible:", id);
        return null;
    }
  }
}

/**
 * Find ID by Name (useful for Excel imports/matching)
 */
export async function findPartyIdByName(name, role = null) {
  if (!name) return null;
  
  // Optimize: search directly via API params
  const params = { search: name };
  if (role) {
      params.customer_type_id = (role === "sender" ? 1 : role === "receiver" ? 2 : null);
  }

  try {
    const res = await api.get("/parties", { params });
    const list = res?.data?.data ?? res?.data ?? [];
    
    if (!list.length) return null;

    // Exact match priority
    const lowerName = String(name).trim().toLowerCase();
    const exact = list.find(p => String(p.name).trim().toLowerCase() === lowerName);
    
    return exact ? exact.id : list[0].id;
  } catch (e) {
    return null;
  }
}