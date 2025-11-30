import api from "./axiosInstance";

const unwrap = (res) => res?.data ?? res;
const norm = (o) => (Array.isArray(o) ? o : Array.isArray(o?.data) ? o.data : o || []);

const isActive = (x) => {
  const v = x?.status ?? x?.active ?? x?.is_active ?? x?.enabled;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "active" || s === "1" || s === "true" || s === "enabled";
  }
  return false;
};

export const createCustomerType = async (payload) => {
  const res = await api.post("/customer-type", payload);
  return unwrap(res);
};

export const getCustomerTypes = async (params = {}) => {
  const res = await api.get("/customer-types", { params });
  return unwrap(res);
};

export const getActiveCustomerTypes = async (params = {}) => {
  // Allow per_page but strip unknown filters
  const { per_page = 500, ..._ignored } = params;

  try {
    const res = await api.get("/active-customer-types", { params: { per_page } });
    return norm(unwrap(res));
  } catch (_) {
    const res = await api.get("/customer-types", { params: { per_page } });
    const list = norm(unwrap(res));
    return list.filter(isActive);
  }
};

export const getInactiveCustomerTypes = async (params = {}) => {
  const res = await api.get("/inactive-customer-types", { params });
  return unwrap(res);
};

export default {
  createCustomerType,
  getCustomerTypes,
  getActiveCustomerTypes,
  getInactiveCustomerTypes,
};