import api from "./axiosInstance";

const unwrap = (res) => res?.data ?? res;

export const createParty = async (payload) => {
  const isFD = typeof FormData !== "undefined" && payload instanceof FormData;
  const res = await api.post("/party", payload, {
    transformRequest: isFD ? [(d) => d] : undefined,
  });
  return unwrap(res);
};

export const updateParty = async (id, payload) => {
  if (id == null) throw new Error("partyId is required");
  const isFD = typeof FormData !== "undefined" && payload instanceof FormData;
  const res = await api.post(`/party/${id}`, payload, {
    transformRequest: isFD ? [(d) => d] : undefined,
  });
  return unwrap(res);
};

export const getParties = async (params = {}) => {
  const res = await api.get("/parties", { params });
  return unwrap(res);
};

// Fixing the API call to filter parties by customer type correctly
export const getPartiesByCustomerType = async (customerTypeId, params = {}) => {
  if (customerTypeId == null) throw new Error("customerTypeId is required");
  const res = await api.get("/parties", { params });
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

export const getPartyById = async (id) => {
  if (id == null) throw new Error("partyId is required");
  const { data } = await api.get(`/party/${id}`);
  return data?.data ?? data ?? null;
};

export async function getPartyByIdFlexible(id) {
  if (id == null) throw new Error("getPartyByIdFlexible: id required");
  const idNum = Number(id);
  const suffix = Number.isFinite(idNum) ? String(idNum) : String(id);

  const endpoints = [
    `/party/${suffix}`,               // <- primary (your working endpoint)
    `/public/api/party/${suffix}`,    // fallback (public prefix)
    `/parties/${suffix}`,             // legacy style
    `/public/api/parties/${suffix}`,  // legacy public
  ];

  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const { data } = await api.get(ep, { timeout: 15000 });
      return (
        data?.data?.party ??
        data?.party ??
        data?.data ??
        data ??
        null
      );
    } catch (e) {
      lastErr = e;
      // try next endpoint
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

export async function findPartyIdByName(name, role = null) {
  if (!name) return null;

  const roleToTypeId = (r) => (r === "sender" ? 1 : r === "receiver" ? 2 : null);
  const wantTypeId = roleToTypeId(String(role || "").toLowerCase());

  const endpoints = [
    { url: "/parties", params: { search: name } },
    { url: "/parties", params: { name } },
    { url: "/public/api/parties", params: { search: name } },
    { url: "/public/api/parties", params: { name } },
  ];

  let lastErr = null;
  for (const { url, params } of endpoints) {
    try {
      const { data } = await api.get(url, { params, timeout: 15000 });
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      if (!list.length) continue;

      const canon = (s) => String(s || "").trim().toLowerCase();
      const tgt = canon(name);

      // name equality > contains; role match adds weight
      const scored = list
        .map((p) => ({
          ...p,
          _score:
            (canon(p?.name) === tgt ? 2 : (canon(p?.name).includes(tgt) ? 1 : 0)) +
            (wantTypeId && Number(p?.customer_type_id) === wantTypeId ? 1 : 0),
        }))
        .filter((p) => p._score > 0)
        .sort((a, b) => b._score - a._score);

      const best = scored[0] || null;
      if (best?.id) return Number(best.id);
    } catch (e) {
      lastErr = e;
      // try next
    }
  }
  // swallow error; caller can log
  return null;
}

export default {
  createParty,
  updateParty,
  getParties,
  getPartyById,
  getPartiesByCustomerType,
  getPartyByIdFlexible,
  findPartyIdByName,
};
