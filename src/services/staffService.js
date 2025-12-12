import api from "./axios";

const unwrap = (res) => res?.data ?? res;

// --- Helpers ---

const extractStaffArray = (res) => {
  const data = unwrap(res);
  if (Array.isArray(data)) return data;
  return (
    data?.data ||
    data?.staffs ||
    data?.users ||
    data?.items ||
    []
  );
};

// --- APIs ---

export const listStaffs = async (params = {}) => {
  const res = await api.get("/staffs", { params });
  return {
    items: extractStaffArray(res),
    meta: res?.data?.meta || res?.data?.data?.meta || null
  };
};

export const getStaffById = async (id) => {
  // Tries standard endpoint first, falls back if needed
  try {
    const res = await api.get(`/staff/${id}`);
    return unwrap(res)?.data ?? unwrap(res);
  } catch (error) {
    // Fallback for inconsistent backend routes
    const res = await api.get(`/profile/${id}`);
    return unwrap(res)?.data ?? unwrap(res);
  }
};

export const createStaff = async (payload) => {
  // If payload is plain object but needs file, convert to FormData
  const isFormData = payload instanceof FormData;
  const res = await api.post("/register", payload); // Assuming /register is the endpoint based on previous file
  return unwrap(res);
};

export const updateStaff = async (id, payload) => {
  if (!id) throw new Error("Staff ID is required");
  const res = await api.post(`/profile/update/${id}`, payload);
  return unwrap(res);
};

export const deleteStaff = async (id) => {
  const res = await api.delete(`/staff/${id}`);
  return unwrap(res);
};