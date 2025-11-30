// src/api/branchApi.js
import api from "./axiosInstance";

/* ───────────────────────────── helpers ───────────────────────────── */

const has = (v) => v !== null && v !== undefined;
const unwrap = (res) => res?.data ?? res;

/**
 * Return the first array-like payload from a lot of common API shapes.
 * Works for:
 *  - { data: { data: [...] } }
 *  - { data: { branches: [...] } }
 *  - { branches: [...] }
 *  - { items: [...] }, { results: [...] }, etc.
 */
const firstArray = (obj) => {
  if (Array.isArray(obj)) return obj;
  const o = unwrap(obj);
  if (!o || typeof o !== "object") return [];

  const paths = [
    o?.data?.data, o?.data?.items, o?.data?.results, o?.data?.branches, o?.data?.list,
    o?.data, o?.items, o?.results, o?.branches, o?.list,
  ];
  for (const p of paths) if (Array.isArray(p)) return p;

  const firstArr = Object.values(o).find(Array.isArray);
  return Array.isArray(firstArr) ? firstArr : [];
};

/**
 * Normalize ONE branch object to the fields the UI expects.
 */
const pick = (d = {}) => ({
  id: d.id ?? d.branch_id ?? d._id ?? null,

  branch_name: d.branch_name ?? d.name ?? d.title ?? "",
  branch_name_ar: d.branch_name_ar ?? d.name_ar ?? d.ar_name ?? "",

  branch_code: d.branch_code ?? d.code ?? "",
  branch_location: d.branch_location ?? d.location ?? "",
  branch_address: d.branch_address ?? d.address ?? "",

  branch_contact_number: d.branch_contact_number ?? d.contact_number ?? d.phone ?? "",
  branch_alternative_number: d.branch_alternative_number ?? d.alternative_number ?? d.alt_phone ?? "",
  branch_email: d.branch_email ?? d.email ?? "",

  logo_url: d.logo_url ?? d.logo ?? d.logoUrl ?? "",
  branch_website: d.branch_website ?? d.website ?? "",

  status: d.status ?? d.active ?? d.is_active ?? "",
  created_by: d.created_by ?? "",
  created_by_email: d.created_by_email ?? "",
});

/** Normalize ANY list response to an array of `pick(x)` */
const normalizeArray = (raw) => firstArray(raw).map(pick);

/** Truthy “active” across different backends */
const isActive = (b) => {
  const s = String(b?.status ?? "").trim().toLowerCase();
  return s === "1" || s === "active" || s === "true" || s === "yes";
};

/** Header builder (token optional) */
const withAuth = (token, extra = {}) =>
  token ? { headers: { Authorization: `Bearer ${token}` }, ...extra } : { ...extra };

/* ──────────────────────── Single / by id ───────────────────────── */
/**
 * Fetch ONE branch by id from multiple common endpoints and unwrap/normalize.
 * Usage: const b = await getBranchByIdSmart(id, token)
 */
export async function getBranchByIdSmart(id, token) {
  if (!has(id)) throw new Error("Branch id is required");

  const tries = [
    `/branches/${id}`,
    `/branch/${id}`,
    `/api/branches/${id}`,
    `/api/branch/${id}`,
  ];

  let lastErr;
  for (const url of tries) {
    try {
      const res = await api.get(url, withAuth(token));
      const data = unwrap(res);
      const obj =
        data?.branch ??
        data?.data?.branch ??
        data?.data?.data ??
        data?.data ??
        data;

      if (obj && typeof obj === "object") return pick(obj);
    } catch (e) {
      lastErr = e;
      // try next endpoint
    }
  }

  // As a final fallback: list, then find the id locally
  try {
    const list = await getAllBranches({}, token);
    const found = list.find((x) => String(x.id) === String(id));
    if (found) return found;
  } catch (e) {
    lastErr = e;
  }

  throw lastErr || new Error("Branch not found");
}

/* ────────────────────────── Lists ─────────────────────────── */

/**
 * Get ALL branches (any status). Tries common list endpoints then normalizes.
 */
export async function getAllBranches(params = {}, token) {
  const attempts = [
    { url: "/branches",        cfg: withAuth(token, { params }) },
    { url: "/api/branches",    cfg: withAuth(token, { params }) },
    { url: "/branch",          cfg: withAuth(token, { params }) },
  ];

  for (const a of attempts) {
    try {
      const res = await api.get(a.url, a.cfg);
      const list = normalizeArray(res);
      if (list.length) return list;
    } catch (_) {}
  }

  // Nothing worked
  return [];
}

/**
 * Get ACTIVE branches only. Token-aware and endpoint-agnostic.
 * Returns a normalized array.
 */
export async function getActiveBranches(params = {}, token) {
  const all = [];
  let page = 1;
  let totalPages = 1;

  try {
    do {
      const res = await api.get("/branches", withAuth(token, { params: { status: 1, per_page: 100, page, ...params } }));
      const raw = unwrap(res);

      // detect nested paginator shape
      const dataArray = firstArray(raw);
      const items = dataArray.map(pick).filter(isActive);
      all.push(...items);

      // pagination meta
      const meta = raw?.data ?? raw ?? {};
      totalPages = meta.last_page ?? meta.data?.last_page ?? 1;
      page++;
    } while (page <= totalPages && totalPages > 1);

    // if nothing came through, try alternate endpoints
    if (!all.length) {
      const attempts = [
        { url: "/branches/active" },
        { url: "/active-branches" },
        { url: "/branch/active" },
        { url: "/api/branches" },
      ];

      for (const a of attempts) {
        try {
          const res = await api.get(a.url, withAuth(token, { params: { status: 1, ...params } }));
          const arr = normalizeArray(res).filter(isActive);
          if (arr.length) return arr;
        } catch (_) {}
      }
    }

    return all.filter(isActive);
  } catch (err) {
    return [];
  }
}

/**
 * Get INACTIVE branches only.
 */
export async function getInactiveBranches(params = {}, token) {
  const attempts = [
    { url: "/branches/inactive", cfg: withAuth(token, { params }) },
    { url: "/inactive-branches", cfg: withAuth(token, { params }) },
  ];

  for (const a of attempts) {
    try {
      const res = await api.get(a.url, a.cfg);
      const list = normalizeArray(res).filter((b) => !isActive(b));
      if (list.length) return list;
    } catch (_) {}
  }

  // Fallback: fetch all and filter
  try {
    const res = await api.get("/branches", withAuth(token, { params: { per_page: 500, ...params } }));
    return normalizeArray(res).filter((b) => !isActive(b));
  } catch {
    return [];
  }
}

/* ───────────────────────── CRUD passthroughs ───────────────────────
   (Keep these if your UI calls them elsewhere; they return raw data)
--------------------------------------------------------------------- */

export const viewBranch   = async (id, token) =>
  (await api.get(`/branch/${id}`, withAuth(token))).data;

export const storeBranch  = async (payload, token) =>
  (await api.post("/branch", payload, withAuth(token))).data;

export const updateBranch = async (id, payload, token) =>
  (await api.put(`/branch/${id}`, payload, withAuth(token))).data;

export const deleteBranch = async (id, token) => {
  try {
    // Primary: real DELETE
    const res = await api.delete(`/branch/${id}`, withAuth(token));
    return res.data;
  } catch (e) {
    // Some environments block DELETE/PUT. Fallback to POST + _method=DELETE.
    const status = e?.response?.status;
    if (status === 405 || status === 404) {
      const fd = new FormData();
      fd.append("_method", "DELETE");
      const res = await api.post(`/branch/${id}`, fd, withAuth(token, {
        headers: { "Content-Type": "multipart/form-data" },
      }));
      return res.data;
    }
    throw e;
  }
};

// Aliases for compatibility
export const removeBranch = deleteBranch;
export const destroyBranch = deleteBranch;

/* ─────────────────────────── Users in a branch ───────────────────── */

export const getBranchUsers = async (branchId, token) => {
  if (!branchId) return [];
  try {
    const res = await api.get(`/branches/${branchId}/users`, withAuth(token));
    const data = unwrap(res);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.users)) return data.users;
    const firstArr = Object.values(data || {}).find(Array.isArray);
    return Array.isArray(firstArr) ? firstArr : [];
  } catch {
    return [];
  }
};


// add this to branchApi.js
export async function getAllBranchesPaged(params = {}, token) {
  const res = await api.get("/branches", withAuth(token, { params }));
  const raw = unwrap(res);

  // Laravel paginator shape
  const pageData = raw?.data || {};
  const items = firstArray(raw).map(pick); // normalize  page's "data" array
  const meta = {
    current_page: pageData.current_page ?? 1,
    per_page: pageData.per_page ?? items.length,
    total: pageData.total ?? items.length,
    last_page: pageData.last_page ?? 1,
    next_page_url: pageData.next_page_url || null,
    prev_page_url: pageData.prev_page_url || null,
  };
  return { items, meta };
}
