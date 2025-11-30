import api from "./axiosInstance";

const unwrap = (res) => res?.data ?? res;

const normalizeList = (p) => {
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.data)) return p.data.data;
  if (Array.isArray(p?.countries)) return p.countries;
  if (Array.isArray(p?.states)) return p.states;
  if (Array.isArray(p?.districts)) return p.districts;
  const firstArray = p && typeof p === "object" ? Object.values(p).find(Array.isArray) : null;
  return Array.isArray(firstArray) ? firstArray : [];
};

const isActive = (row) => {
  // consider typical flags your API might use
  const v = row?.active ?? row?.status ?? row?.is_active ?? row?.enabled;
  if (typeof v === "boolean") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n === 1 : String(v || "").toLowerCase() === "active";
};

/* -------------------- Countries -------------------- */

export const getCountries = async (params = {}, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.get("/countries", { params, headers });
  return unwrap(res);
};

export const getActiveCountries = async (params = {}) => {
  try {
    const res = await api.get("/active-countries", { params }); // may 404 on your server
    return unwrap(res);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    // fallback: /countries then filter
    const all = await getCountries(params);
    const list = normalizeList(all).filter(isActive);
    return Array.isArray(all?.data) ? { data: list } : list;
  }
};

/* -------------------- States -------------------- */
export const getStates = async (params = {}) => {
  const res = await api.get("/states", { params });
  return unwrap(res);
};
export const getActiveStates = async (params = {}) => {
  try {
    const res = await api.get("/active-states", { params });
    return unwrap(res);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    const all = await getStates(params);
    const list = normalizeList(all).filter(isActive);
    return Array.isArray(all?.data) ? { data: list } : list;
  }
};
export const getStatesByCountry = async (countryId, extra = {}, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.get("/states", {
    params: { country_id: countryId, ...extra },   // <-- no Number()
    headers,
  });
  return unwrap(res);
};

/* -------------------- Districts -------------------- */
export const getDistricts = async (params = {}) => {
  const res = await api.get("/districts", { params });
  return unwrap(res);
};
export const getActiveDistricts = async (params = {}) => {
  try {
    const res = await api.get("/active-districts", { params });
    return unwrap(res);
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
    const all = await getDistricts(params);
    const list = normalizeList(all).filter(isActive);
    return Array.isArray(all?.data) ? { data: list } : list;
  }
};

export const getDistrictsByState = async (stateId, extra = {}, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await api.get("/districts", {
    params: { state_id: stateId, ...extra }, // state_id: 258 (string or number is fine)
    headers,
  });
  return unwrap(res); // should be an array like your sample
};

export const getActiveDistrictsByState = async (stateId, extra = {}) =>
  getActiveDistricts({ state_id: stateId, ...extra });

export const getDistrictsByStateFlexible = async (stateId, extra = {}, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  let res = await api.get("/districts", { params: { state_id: stateId, ...extra }, headers });
  let list = unwrap(res);
  if (Array.isArray(list) && list.length) return list;

  // try with stateId (camelCase)
  res = await api.get("/districts", { params: { stateId: stateId, ...extra }, headers });
  list = unwrap(res);
  if (Array.isArray(list) && list.length) return list;

  // try with state (some backends do this)
  res = await api.get("/districts", { params: { state: stateId, ...extra }, headers });
  list = unwrap(res);
  if (Array.isArray(list) && list.length) return list;

  // try nested route /states/:id/districts
  try {
    res = await api.get(`/states/${stateId}/districts`, { params: { ...extra }, headers });
    list = unwrap(res);
    if (Array.isArray(list) && list.length) return list;
  } catch {
    /* ignore */
  }

  // give back whatever we have (empty array is fine)
  return Array.isArray(list) ? list : [];
};