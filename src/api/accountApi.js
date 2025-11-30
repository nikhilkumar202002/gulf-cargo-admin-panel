import axiosInstance from "./axiosInstance";
import { setToken, clearToken } from "../auth/tokenStore";

/* -------------------- helpers -------------------- */
const unwrap = (res) => res?.data ?? res;
const withCreds = { withCredentials: false }; // flip to true if you use Sanctum cookies

const requiredId = (id, label = "id") => {
  if (id === undefined || id === null || id === "") throw new Error(`Missing ${label}`);
  return String(id);
};

const patternUrl = (pattern, id) => pattern.replace(":id", requiredId(id));

/* -------------------- configurable patterns -------------------- */
// Delete
const DELETE_PATTERN =
  import.meta.env.VITE_STAFF_DELETE_PATTERN || "/staff/:id"; // e.g. "/staff/:id" or "/staffs/:id"
// Show (primary)
const SHOW_PATTERN =
  import.meta.env.VITE_STAFF_SHOW_PATTERN || "/staff/:id";
// Profile update (POST)
const UPDATE_PROFILE_PATTERN =
  import.meta.env.VITE_PROFILE_UPDATE_PATTERN || "/profile/update/:id";
// Staff register path
const STAFF_REGISTER_PATH =
  import.meta.env.VITE_STAFF_REGISTER_PATH || "/register";
// Auth login path
const AUTH_LOGIN_PATH =
  import.meta.env.VITE_AUTH_LOGIN_PATH || "/login";

/* ================================================================
   AUTH
================================================================ */
export const register = async (userData) => {
  const res = await axiosInstance.post("/register", userData);
  return unwrap(res);
};

export const loginUser = async (credentials) => {
  const res = await axiosInstance.post(AUTH_LOGIN_PATH, credentials);
  const data = unwrap(res);
  const t = data?.access_token || data?.token || data?.data?.access_token || null;
  // Removed setToken(t) to handle in Redux
  return { ...data, token: t };
};

export const getProfile = async () => unwrap(await axiosInstance.get("/profile"));

export const logout = async () => {
  try {
    await axiosInstance.post("/logout");
  } finally {
    clearToken();
  }
};

export const forgotPassword = async (email) =>
  unwrap(await axiosInstance.post("/forgot-password", { email }));

export const resetPassword = async (email, otp, password) =>
  unwrap(await axiosInstance.post("/reset-password", { email, otp, password }));

/* ================================================================
   STAFF CRUD-ish
================================================================ */
// Create staff (supports File via auto-FormData)
export const staffRegister = async (payload, token, axiosOpts = {}) => {
  const body =
    payload instanceof FormData
      ? payload
      : (() => {
          const fd = new FormData();
          Object.entries(payload || {}).forEach(([k, v]) => {
            if (v == null) return;
            if (Array.isArray(v)) {
              const key = k.endsWith("[]") ? k : `${k}[]`;
              v.forEach((val) => fd.append(key, val));
            } else {
              fd.append(k, v);
            }
          });
          return fd;
        })();

  const res = await axiosInstance.post(STAFF_REGISTER_PATH, body, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/json",
      // Let browser set multipart boundary automatically when FormData
    },
    ...axiosOpts,
  });
  return unwrap(res);
};

// List staff (robust array picker)
export const listStaffs = async (params = {}) => {
  const res = await axiosInstance.get("/staffs", { params });
  const payload = unwrap(res);

  const pickArray = (o) => {
    if (!o) return [];
    if (Array.isArray(o)) return o;

    if (Array.isArray(o.data)) return o.data;                 // { data:[...] }
    if (Array.isArray(o?.data?.data)) return o.data.data;     // { data:{data:[...]} }

    if (Array.isArray(o?.staffs)) return o.staffs;            // { staffs:[...] }
    if (Array.isArray(o?.staff)) return o.staff;              // { staff:[...] }
    if (Array.isArray(o?.staffs?.data)) return o.staffs.data; // { staffs:{data:[...]} }
    if (Array.isArray(o?.data?.staffs)) return o.data.staffs; // { data:{staffs:[...]} }
    if (Array.isArray(o?.data?.staffs?.data)) return o.data.staffs.data;

    const keys = ["users", "items", "results", "records", "rows", "list"];
    for (const k of keys) {
      if (Array.isArray(o[k])) return o[k];
      if (Array.isArray(o?.data?.[k])) return o.data[k];
    }

    // last resort: deep walk
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        const nested = pickArray(v);
        if (nested.length) return nested;
      }
    }
    return [];
  };

  const items = pickArray(payload);

  const meta =
    payload?.meta ||
    payload?.data?.meta ||
    payload?.data?.staffs?.meta ||
    payload?.staffs?.meta ||
    null;

  return { items, meta };
};

// Get user by ID (for collected_by_person)
export const getUserById = async (id) => {
  const res = await axiosInstance.get(`/staffs/${requiredId(id)}`);
  return unwrap(res);
};

// Delete staff (robust with Laravel fallback)
export const deleteStaff = async (params, axiosOpts = {}) => {
  // Accept either a plain id or an object like { id: 123 }
  const staffId = params?.id ?? params;
  const url = patternUrl(DELETE_PATTERN, staffId);

  try {
    const res = await axiosInstance.delete(url, {
      ...withCreds,
      headers: { Accept: "application/json" },
      ...axiosOpts,
    });
    // A successful DELETE often returns a 204 No Content, so we can return true.
    // If it returns data, that will be passed through.
    return res?.data ?? true;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const serverMsg =
      data?.message || data?.error || `Delete failed (${status || "network"})`;
    const e = new Error(serverMsg);
    e.status = status;
    throw e;
  }
};

/* -------------------- robust single fetch -------------------- */
/**
 * Get a single staff record by id (resilient).
 * Tries env SHOW_PATTERN first, then `/profile/:id` and `/staffs/:id`.
 * Always returns a single user object, unwrapped.
 */
export const getStaff = async (id, params = {}, axiosOpts = {}) => {
  const attempts = [
    patternUrl(SHOW_PATTERN, id), // default: /staff/:id
    `/profile/${requiredId(id)}`, // many backends serve via profile
    `/staffs/${requiredId(id)}`,  // plural fallback
  ];

  const pickOne = (o) => {
    if (!o) return null;
    // direct object
    if (o.id || o.email || o.name) return o;

    // common single-object wrappers
    if (o.user && typeof o.user === "object") return o.user;
    if (o.staff && typeof o.staff === "object" && !Array.isArray(o.staff)) return o.staff;
    if (o.profile && typeof o.profile === "object") return o.profile;

    if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
      const d = pickOne(o.data);
      if (d) return d;
    }
    if (o.result && typeof o.result === "object") return o.result;

    // first element from common arrays
    const arrays = ["users", "staffs", "staff", "items", "results", "records", "data"];
    for (const k of arrays) {
      const arr =
        Array.isArray(o?.[k]) ? o[k] :
        Array.isArray(o?.data?.[k]) ? o.data[k] :
        null;
      if (Array.isArray(arr) && arr.length) return arr[0];
    }

    // deep-walk
    for (const v of Object.values(o)) {
      if (v && typeof v === "object") {
        const found = pickOne(v);
        if (found) return found;
      }
    }
    return null;
  };

  let lastErr;
  for (const url of attempts) {
    try {
      const res = await axiosInstance.get(url, { params, ...axiosOpts });
      const payload = unwrap(res);
      return pickOne(payload) ?? payload;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Failed to fetch staff");
};

/* -------------------- update profile (POST) -------------------- */
/**
 * Update a single staff profile by id (super admin).
 * If payload contains File/Blob → multipart; else JSON.
 * Accepts `avatar` file; for removal, send `avatar_remove=1`.
 */
export const updateStaffProfile = async (id, payload = {}, axiosOpts = {}) => {
  const url = patternUrl(UPDATE_PROFILE_PATTERN, id);

  const hasFile =
    payload instanceof FormData
      ? true
      : Object.values(payload || {}).some((v) => v instanceof File || v instanceof Blob);

  const body =
    hasFile && !(payload instanceof FormData)
      ? (() => {
          const fd = new FormData();
          Object.entries(payload).forEach(([k, v]) => {
            if (v == null) return;
            if (Array.isArray(v)) {
              const key = k.endsWith("[]") ? k : `${k}[]`;
              v.forEach((val) => fd.append(key, val));
            } else {
              fd.append(k, v);
            }
          });
          return fd;
        })()
      : payload;

  const res = await axiosInstance.post(url, body, {
    headers: {
      Accept: "application/json",
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    },
    ...axiosOpts,
  });

  return unwrap(res);
};
