// src/api/shipmentMethodApi.js
import api from "./axiosInstance";

const LIST_ENDPOINT   = "/shipment-methods"; // GET (optionally ?status=1|0)
const CREATE_ENDPOINT = "/shipment-method";  // POST (singular)

// unwrap helpers (unchanged)
const extractArray = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

/** Create a shipment method
 *  @param {{name:string, code?:string, description?:string, status:0|1}} data
 */
export const createShipmentMethod = async (data, token, axiosOpts = {}) => {
  const cfg = { ...axiosOpts };
  if (token) {
    cfg.headers = { ...(axiosOpts.headers || {}), Authorization: `Bearer ${token}` };
  }
  // ✅ Correct endpoint for create
  const res = await api.post(CREATE_ENDPOINT, data, cfg);
  return res?.data ?? res;
};

export const getShipmentMethods = async (params = {}, token, axiosOpts = {}) => {
  const cfg = { ...axiosOpts, params };
  if (token) cfg.headers = { ...(axiosOpts.headers || {}), Authorization: `Bearer ${token}` };
  const res = await api.get(LIST_ENDPOINT, cfg);
  return extractArray(res);
};

export const getActiveShipmentMethods = (token, axiosOpts = {}) =>
  getShipmentMethods({ status: 1 }, token, axiosOpts);

export const getInactiveShipmentMethods = (token, axiosOpts = {}) =>
  getShipmentMethods({ status: 0 }, token, axiosOpts);
