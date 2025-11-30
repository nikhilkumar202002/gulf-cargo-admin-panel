import axiosInstance from "./axiosInstance";

const unwrap = (res) => res?.data ?? res;

const normalizeArray = (o) => {
  if (!o) return [];
  if (Array.isArray(o)) return o;

  const d =
    o.data ??
    o.document_types ??
    o.documentTypes ??
    o.items ??
    null;

  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data; 
  if (Array.isArray(o?.data?.data)) return o.data.data;

  const firstArr = Object.values(o).find(Array.isArray);
  return Array.isArray(firstArr) ? firstArr : [];
};

// Detect "active" truthiness across common shapes
const isActive = (x) => {
  const v =
    x?.status ?? x?.active ?? x?.is_active ?? x?.isActive ?? x?.enabled ?? x?.isEnabled;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    return s === "active" || s === "1" || s === "true" || s === "enabled";
  }
  return false;
};

/* ---------------- CRUD + lists ---------------- */

// Create (POST /document-type)
export const createDocumentType = async (data) => {
  const res = await axiosInstance.post("/document-type", data);
  return unwrap(res);
};

// Update (PUT /document-type/:id)
export const updateDocumentType = async (id, data) => {
  const res = await axiosInstance.put(`/document-type/${id}`, data);
  return unwrap(res);
};

// View single (GET /document-type/:id)
export const viewDocumentType = async (id) => {
  const res = await axiosInstance.get(`/document-type/${id}`);
  return unwrap(res);
};

/* ---------------- lists ---------------- */

// Get all (GET /document-types)
export const getDocumentTypes = async (params = {}) => {
  const res = await axiosInstance.get("/document-types", { params });
  return normalizeArray(unwrap(res));
};


export const getActiveDocumentTypes = async (params = {}) => {
  try {
    const res = await axiosInstance.get("/active-document-types", { params });
    const list = normalizeArray(unwrap(res));
    if (list.length) return list;
  } catch (_) {

  }

  const merged = {
    per_page: 500,
    active: 1,
    status: "Active",
    ...params,
  };
  const res = await axiosInstance.get("/document-types", { params: merged });
  const list = normalizeArray(unwrap(res));
  return list.filter(isActive);
};

export const getInactiveDocumentTypes = async (params = {}) => {
  try {
    const res = await axiosInstance.get("/inactive-document-types", { params });
    const list = normalizeArray(unwrap(res));
    if (list.length) return list;
  } catch (_) {

  }

  const res = await axiosInstance.get("/document-types", { params: { per_page: 500, ...params } });
  const list = normalizeArray(unwrap(res));
  return list.filter((x) => !isActive(x));
};