
import api from "./axiosInstance";


const unwrap = (res) => res?.data?.data ?? res?.data;

const formatAxiosError = (err) => {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Request failed";
  const e = new Error(msg);
  e.status = err?.response?.status;
  e.details = err?.response?.data;
  return e;
};

/**
 * POST /license-type
 * Create a license type.
 * @param {Object|FormData} payload
 * @param {Object} [config] - optional axios config (headers, signal, etc.)
 */
export async function createLicenseType(payload = {}, config = {}) {
  try {
    // If payload is FormData, axiosInstance already removes Content-Type boundary for you.
    const res = await api.post("/license-type", payload, config);
    return unwrap(res);
  } catch (err) {
    throw formatAxiosError(err);
  }
}

/**
 * GET /license-types
 * Optional query params, e.g. { status: 1 } to fetch only active.
 * @param {Object} [params]
 * @param {Object} [config]
 */
export async function getLicenseTypes(params = {}, config = {}) {
  try {
    const res = await api.get("/license-types", { params, ...config });
    return unwrap(res);
  } catch (err) {
    throw formatAxiosError(err);
  }
}

/**
 * GET /license-types?status=1
 * Convenience helper for active license types.
 * @param {Object} [config]
 */
export function getActiveLicenseTypes(config = {}) {
  return getLicenseTypes({ status: 1 }, config);
}

export default {
  createLicenseType,
  getLicenseTypes,
  getActiveLicenseTypes,
};
