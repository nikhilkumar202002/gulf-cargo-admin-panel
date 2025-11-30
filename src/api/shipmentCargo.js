// src/api/shipmentCargo.js
import axiosInstance from "./axiosInstance";

/**
 * Cargo Shipment API
 *
 * Endpoints:
 *  - POST   /cargo-shipment                     (create a shipment)
 *  - GET    /cargo-shipments                    (list)
 *  - GET    /cargo-shipments?shipment_status_id=2
 *  - GET    /cargo-shipments?branch_id=1
 *  - GET    /cargo-shipments?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
 *  - GET    /cargo-shipment/:id                 (single view)
 */

/* ---------- shared error helper ---------- */
function parseAxiosError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const serverMsg = data?.message || data?.error;
  const fieldErrors = data?.errors && typeof data.errors === "object" ? data.errors : null;

  let msg = serverMsg || err?.message || `Request failed${status ? ` (${status})` : ""}`;
  if (fieldErrors) {
    const flat = Object.entries(fieldErrors).map(
      ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
    );
    msg += ` — ${flat.join(" | ")}`;
  }
   const e = new Error(msg);
  e.status = status;
  e.details = data;       // <-- important: details contains already_used_ids
  throw e;
}

/* ---------- tiny querystring helper ---------- */
const qs = (obj = {}) =>
  new URLSearchParams(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
  ).toString();

/* ============================================================================================
 * GET /cargo-shipments  (server-side filtering supported)
 * ========================================================================================== */
export async function listCargoShipments(params = {}) {
  try {
    const { data } = await axiosInstance.get("/cargo-shipments", { params });
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * GET /cargo-shipment/:id
 * ========================================================================================== */
export async function getCargoShipment(id) {
  try {
    const { data } = await axiosInstance.get(`/cargo-shipment/${id}`);
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * POST /cargo-shipment  (create)
 * Body can be passed in either backend field names or UI field names; we normalize here.
 * Returns: created shipment object (shape depends on backend)
 * ========================================================================================== */
export async function createCargoShipment(raw) {
  const payload = {
    // required
    origin_port_id:
      raw?.origin_port_id ?? raw?.portOfOrigin ?? raw?.port_origin_id ?? null,
    destination_port_id:
      raw?.destination_port_id ?? raw?.portOfDestination ?? raw?.port_destination_id ?? null,
    awb_or_container_number:
      raw?.awb_or_container_number ?? raw?.awbNo ?? raw?.awb_no ?? "",
    created_on:
      raw?.created_on ?? raw?.shipment_date ?? raw?.date ?? raw?.createdOn ?? "",
    branch_id: Number(raw?.branch_id),
    created_by_id: Number(raw?.created_by_id),

    // required in your flow
    shipment_status_id:
      raw?.shipment_status_id != null ? Number(raw.shipment_status_id) : undefined,
    cargo_ids: Array.isArray(raw?.cargo_ids) ? raw.cargo_ids.map(Number) : [],

    // optional
    shipment_number: raw?.shipment_number || undefined,
    license_details: raw?.license_details || undefined,
    exchange_rate:
      raw?.exchange_rate != null && raw.exchange_rate !== ""
        ? Number(raw.exchange_rate)
        : undefined,
    shipping_method_id: raw?.shipping_method_id || raw?.shippingMethod || undefined,
    clearing_agent_id: raw?.clearing_agent_id || raw?.clearingAgent || undefined,
    remarks: raw?.remarks || raw?.shipmentDetails || undefined,
  };

  if (payload.origin_port_id != null) payload.origin_port_id = Number(payload.origin_port_id);
  if (payload.destination_port_id != null) payload.destination_port_id = Number(payload.destination_port_id);

  try {
    const { data } = await axiosInstance.post("/cargo-shipment", payload);
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * PATCH /cargo-shipment/:id/mark-in
 * Marks a cargo as "in shipment" (optimistic UI can hide it from free list)
 * ========================================================================================== */
export async function markCargoInShipment(cargoId, body = {}) {
  const id = Number(cargoId);
  if (!id) throw new Error("markCargoInShipment: invalid cargo id");
  try {
    const { data } = await axiosInstance.patch(`/cargo-shipment/${id}/mark-in`, body);
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * PATCH /cargo-shipment/:id/mark-not
 * Reverts a cargo back to "not in shipment"
 * ========================================================================================== */
export async function markCargoNotInShipment(cargoId, body = {}) {
  const id = Number(cargoId);
  if (!id) throw new Error("markCargoNotInShipment: invalid cargo id");
  try {
    const { data } = await axiosInstance.patch(`/cargo-shipment/${id}/mark-not`, body);
    return data;
  } catch (err) {
    throw parseAxiosError(err);
  }
}

/* ============================================================================================
 * PATCH /cargo-shipment/:id/status
 * Updates the status of a single shipment.
 * Body: { shipment_status_id: number, remarks?: string }
 * ========================================================================================== */
async function requestWithFallback({ candidates, body }) {
  let lastErr;
  for (const { method, url } of candidates) {
    try {
      const { data } = await axiosInstance.request({
        method,
        url,
        data: body,
        headers: { "Content-Type": "application/json" },
      });
      return data;
    } catch (err) {
      const status = err?.response?.status;
      if (![400, 404, 405].includes(status)) throw parseAxiosError(err);
      lastErr = err;
      // continue to next candidate
    }
  }
  throw parseAxiosError(lastErr);
}

export async function updateCargoShipmentStatus(shipmentId, payload = {}) {
  const id = Number(shipmentId);
  if (!id) throw new Error("updateCargoShipmentStatus: invalid shipment id");

  const body = {
    shipment_status_id:
      payload?.shipment_status_id != null
        ? Number(payload.shipment_status_id)
        : payload?.status_id != null
        ? Number(payload.status_id)
        : undefined,
    remarks: payload?.remarks || payload?.note || undefined,
  };
  if (!body.shipment_status_id) {
    throw new Error("updateCargoShipmentStatus: shipment_status_id is required");
  }

  // Try PATCH first (your API spec), then PUT as a fallback
  const candidates = [
    { method: "PATCH", url: `/cargo-shipment/${id}/status` },
    { method: "PUT",   url: `/cargo-shipment/${id}/status` },
  ];

  try {
    for (const { method, url } of candidates) {
      try {
        const { data } = await axiosInstance.request({
          method,
          url,
          data: body,
          headers: { "Content-Type": "application/json" },
        });
        return data;
      } catch (err) {
        const code = err?.response?.status;
        if (![400, 404, 405].includes(code)) throw parseAxiosError(err);
        // else continue to next candidate
      }
    }
    throw new Error("updateCargoShipmentStatus: all attempts failed");
  } catch (err) {
    throw parseAxiosError(err);
  }
}
/* ============================================================================================
 * PATCH /cargo-shipments/status-bulk
 * Bulk updates the status of multiple shipments.
 * Body: { shipment_ids: number[], shipment_status_id: number, remarks?: string }
 * Returns: { updated_ids: number[], skipped_ids?: number[], ...backend_specific }
 * ========================================================================================== */
export async function bulkUpdateCargoShipmentStatus(input = {}) {
  // normalize ids
  const idsArr =
    Array.isArray(input.shipment_ids) && input.shipment_ids.length
      ? input.shipment_ids
      : Array.isArray(input.ids)
      ? input.ids
      : [];
  const shipment_ids = idsArr.map(Number).filter(Boolean);

  // normalize status id
  const statusId =
    input?.shipment_status_id != null
      ? Number(input.shipment_status_id)
      : input?.status_id != null
      ? Number(input.status_id)
      : undefined;

  if (!shipment_ids.length) throw new Error("bulkUpdateCargoShipmentStatus: shipment_ids[] required");
  if (!statusId) throw new Error("bulkUpdateCargoShipmentStatus: shipment_status_id required");

  const body = {
    shipment_status_id: statusId,
    shipment_ids,
    remarks: input?.remarks || input?.note || undefined,
  };

  // Your API: PATCH /cargo-shipment/status/bulk
  // Fallbacks: PUT /cargo-shipment/status/bulk, PATCH/PUT /cargo-shipment/status-bulk
  const candidates = [
    { method: "PATCH", url: `/cargo-shipment/status/bulk` },
    { method: "PUT",   url: `/cargo-shipment/status/bulk` },
    { method: "PATCH", url: `/cargo-shipment/status-bulk` },
    { method: "PUT",   url: `/cargo-shipment/status-bulk` },
  ];

  let lastErr;
  for (const { method, url } of candidates) {
    try {
      const { data } = await axiosInstance.request({
        method,
        url,
        data: body,
        headers: { "Content-Type": "application/json" },
      });
      return data;
    } catch (err) {
      const code = err?.response?.status;
      if (![400, 404, 405].includes(code)) throw parseAxiosError(err);
      lastErr = err; // try next candidate
    }
  }
  throw parseAxiosError(lastErr);
}