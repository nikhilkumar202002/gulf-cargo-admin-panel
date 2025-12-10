import api from "./axios";

const unwrap = (res) => res?.data ?? res;
const normalizeList = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : d?.data ?? [];
};

/* --- PHYSICAL BILLS (Custom Shipments) --- */

export const createPhysicalBill = async (data) => {
  const res = await api.post("/physical-bill", data);
  return unwrap(res);
};

export const getPhysicalBills = async (params = {}, isShipment = null) => {
  // Merge isShipment logic
  const query = { ...params };
  if (isShipment !== null) query.is_shipment = isShipment ? 1 : 0;
  
  const res = await api.get("/physical-bills", { params: query });
  return normalizeList(res); // Returns raw array
};

export const getPhysicalBillById = async (id) => {
  const res = await api.get(`/physical-bill/${id}`);
  return unwrap(res);
};

export const updatePhysicalBill = async (id, data) => {
  const res = await api.put(`/physical-bill/${id}`, data);
  return unwrap(res);
};

export const deletePhysicalBill = async (id) => {
  const res = await api.delete(`/physical-bill/${id}`);
  return unwrap(res);
};

// Renamed from importPhysicalBills to importCustomShipments to match CreateShipmentBill.jsx
export const importCustomShipments = async (file, extra = {}) => {
  const fd = new FormData();
  fd.append("file", file);
  Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  
  const res = await api.post("/physical-bills/import", fd);
  return unwrap(res);
};

/* --- BILL SHIPMENTS (Grouping Bills) --- */

export const createBillShipment = async (payload) => {
  const res = await api.post("/physical-shipment", payload);
  return unwrap(res);
};

export const getBillShipments = async (params = {}) => {
  const res = await api.get("/physical-shipments", { params });
  return normalizeList(res);
};

export const getBillShipmentById = async (id) => {
  const res = await api.get(`/physical-shipment/${id}`);
  return unwrap(res);
};

export const updateBillShipment = async (id, payload) => {
  const res = await api.put(`/physical-shipment/${id}`, payload);
  return unwrap(res);
};

export const updateBillShipmentStatus = async (ids, statusId) => {
  const payload = {
    shipment_ids: Array.isArray(ids) ? ids.map(Number) : [Number(ids)],
    shipment_status_id: Number(statusId),
  };
  const res = await api.post("/physical-shipment/update-status", payload);
  return unwrap(res);
};

export const deleteBillShipments = async (ids) => {
  const payload = {
    shipment_ids: Array.isArray(ids) ? ids.map(Number) : [Number(ids)],
  };
  // Axios delete with body requires 'data' property
  const res = await api.delete("/physical-shipments/bulk-delete", { data: payload });
  return unwrap(res);
};