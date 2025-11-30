// src/api/shipmentStatusApi.js
import api from "./axiosInstance";

const LIST_ENDPOINT   = "/shipment-status"; // GET (optionally ?status=1|0)
const CREATE_ENDPOINT = "/shipment-status"; // POST

// Extract array-shaped payloads from common API response shapes
const extractArray = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

// Merge Authorization header when a token is passed
const withAuth = (token, cfg = {}) =>
  token
    ? { ...cfg, headers: { ...(cfg.headers || {}), Authorization: `Bearer ${token}` } }
    : cfg;

/**
 * Create a shipment status
 * @param {{ name: string, status: 0|1, [key:string]: any }} data
 */
export const createShipmentStatus = async (data, token, axiosOpts = {}) => {
  const cfg = withAuth(token, axiosOpts);
  const res = await api.post(CREATE_ENDPOINT, data, cfg);
  return res?.data ?? res;
};

/**
 * Get shipment statuses (optionally filter by status 1=Active, 0=Inactive)
 * @param {{ status?: 0|1 }} params
 */
export const getShipmentStatuses = async (params = {}, token, axiosOpts = {}) => {
  // normalize status to 0/1 or drop it
  const normalized = { ...params };
  if (normalized.status === "1" || normalized.status === 1) normalized.status = 1;
  else if (normalized.status === "0" || normalized.status === 0) normalized.status = 0;
  else delete normalized.status;

  const cfg = withAuth(token, { ...axiosOpts, params: normalized });
  const res = await api.get(LIST_ENDPOINT, cfg);
  return extractArray(res);
};

// Convenience helpers
export const getActiveShipmentStatuses = (token, axiosOpts = {}) =>
  getShipmentStatuses({ status: 1 }, token, axiosOpts);

export const getInactiveShipmentStatuses = (token, axiosOpts = {}) =>
  getShipmentStatuses({ status: 0 }, token, axiosOpts);
