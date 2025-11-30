// src/api/portApi.js
import api from "./axiosInstance";

/**
 * Endpoints
 * POST   /port
 * GET    /ports
 * GET    /ports?status=1
 * GET    /ports?status=0
 */
const PORTS_ENDPOINT = "/ports";
const PORT_CREATE_ENDPOINT = "/port";

// --- helpers ---------------------------------------------------------------

/** Extract array-shaped data from various backend shapes */
const extractArray = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

/** Merge auth header if token present */
const withAuth = (token, cfg = {}) => {
  if (!token) return cfg;
  return {
    ...cfg,
    headers: { ...(cfg.headers || {}), Authorization: `Bearer ${token}` },
  };
};

// --- API -------------------------------------------------------------------

/**
 * Create a port
 * @param {Object} data - { name, code?, status(0|1), ... }
 * @param {string} token - Bearer token (optional if endpoint is public)
 * @param {Object} axiosOpts - extra axios config
 * @returns {Promise<any>}
 */
export const createPort = async (data, token, axiosOpts = {}) => {
  const cfg = withAuth(token, axiosOpts);
  const res = await api.post(PORT_CREATE_ENDPOINT, data, cfg);
  return res?.data ?? res;
};

/**
 * Get ports (optionally filtered by status)
 * @param {Object} params - e.g. { status: 1 } or { status: 0 }
 * @param {string} token - Bearer token (optional if endpoint is public)
 * @param {Object} axiosOpts - extra axios config
 * @returns {Promise<Array>}
 */
export const getPorts = async (params = {}, token, axiosOpts = {}) => {
  // normalize status to exactly 0/1 or drop it
  const normalized = { ...params };
  if (normalized.status === "1" || normalized.status === 1) normalized.status = 1;
  else if (normalized.status === "0" || normalized.status === 0) normalized.status = 0;
  else delete normalized.status;

  const cfg = withAuth(token, { ...axiosOpts, params: normalized });
  const res = await api.get(PORTS_ENDPOINT, cfg);
  return extractArray(res);
};

/** Convenience wrappers */
export const getActivePorts = (token, axiosOpts = {}) =>
  getPorts({ status: 1 }, token, axiosOpts);

export const getInactivePorts = (token, axiosOpts = {}) =>
  getPorts({ status: 0 }, token, axiosOpts);
