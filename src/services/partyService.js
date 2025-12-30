import api from "./axios";

// Helper to unwrap response
const unwrap = (res) => res?.data ?? res;

/**
 * Create a new party (Sender or Receiver)
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
  
  const isFD = payload instanceof FormData;
  const url = `/party/${id}`;
  
  if (isFD && !payload.has("_method")) {
      payload.append("_method", "PUT");
  }

  const method = isFD ? "post" : "post"; 
  
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
 * FIXED: Now preserves pagination metadata so the UI doesn't hang loading 'all' data.
 */
export const getPartiesByCustomerType = async (customerTypeId, params = {}) => {
  if (customerTypeId == null) throw new Error("customerTypeId is required");
  
  // 1. Pass params (page, per_page, search) to the server
  const serverParams = { ...params, customer_type_id: customerTypeId };
  const res = await api.get("/parties", { params: serverParams });
  
  // Return the full unwrapped response so 'meta' and 'pagination' keys exist
  // This allows PartyList.jsx to detect "hasServerPagination" = true
  return unwrap(res); 
};

export const getPartyById = async (id) => {
  if (!id) throw new Error("partyId is required");
  const res = await api.get(`/party/${id}`);
  return res?.data?.data ?? res?.data ?? unwrap(res);
};

export async function getPartyByIdFlexible(id) {
  if (!id) return null;
  try {
    const res = await api.get(`/party/${id}`);
    return res?.data?.data?.party ?? res?.data?.party ?? res?.data?.data ?? res?.data ?? null;
  } catch (e) {
    try {
        const res2 = await api.get(`/public/api/party/${id}`);
        return res2?.data?.data ?? res2?.data ?? null;
    } catch (e2) {
        console.warn("Failed to fetch party flexible:", id);
        return null;
    }
  }
}

export async function findPartyIdByName(name, role = null) {
  if (!name) return null;
  const params = { search: name };
  if (role) {
      params.customer_type_id = (role === "sender" ? 1 : role === "receiver" ? 2 : null);
  }
  try {
    const res = await api.get("/parties", { params });
    const list = res?.data?.data ?? res?.data ?? [];
    
    if (!list.length) return null;

    const lowerName = String(name).trim().toLowerCase();
    const exact = list.find(p => String(p.name).trim().toLowerCase() === lowerName);
    
    return exact ? exact.id : list[0].id;
  } catch (e) {
    return null;
  }
}