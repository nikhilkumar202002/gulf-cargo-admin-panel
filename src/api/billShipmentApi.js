// api/billShipmentApi.js
import api from "./axiosInstance";

// ---- CREATE (POST /physical-shipment)
export const createBillShipment = async (payload) => {
  const url = "/physical-shipment";
  try {
    const r = await api.post(url, payload);
    return r.data ?? r;
  } catch (e) {
    throw e;
  }
};

// ---- LIST (GET /physical-shipments)  <-- NOTE: plural
export const getBillShipments = async (params = {}) => {
  const url = "/physical-shipments";
  try {
    const res = await api.get(url, { params });
    return res.data ?? res;
  } catch (e) {
    throw e;
  }
};


// Bulk/single in one helper
export const updateBillShipmentStatuses = async (shipmentIds, shipmentStatusId) => {
  const url = "/physical-shipment/update-status";
  const payload = {
    shipment_ids: shipmentIds.map(Number),
    shipment_status_id: Number(shipmentStatusId),
  };
  try {
    const res = await api.post(url, payload);
    return res.data ?? res;
  } catch (e) {
    throw e;
  }
};

export const getBillShipmentById = async (shipmentId) => {
  const url = `/physical-shipment/${shipmentId}`;
  try {
    const res = await api.get(url);
    return res.data ?? res;
  } catch (e) {
    throw e;
  }
};
// ---- UPDATE (PUT /physical-shipment/:id)
export const updateBillShipment = async (shipmentId, payload) => {
  const url = `/physical-shipment/${shipmentId}`;

  try {
    const res = await api.put(url, payload);
    return res.data ?? res;
  } catch (e) {
    throw e;
  }
};

// ---- DELETE (POST /physical-shipments/bulk-delete)
export const deleteBillShipments = async (shipmentIds) => {
  const url = "/physical-shipments/bulk-delete";
  const payload = {
    shipment_ids: Array.isArray(shipmentIds)
      ? shipmentIds.map(Number)
      : [Number(shipmentIds)],
  };

  try {
    // Some APIs accept body with DELETE — if yours doesn’t, use query param fallback.
    const res = await api.delete(url, { data: payload });
    return res.data ?? res;
  } catch (e) {
    throw e;
  }
};

// Convenience single-update wrapper
export const updateSingleBillShipmentStatus = (shipmentId, shipmentStatusId) =>
  updateBillShipmentStatuses([shipmentId], shipmentStatusId);
