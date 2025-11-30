import api from "./axios";

// Helper to unwrap response
const unwrap = (res) => res?.data ?? res;

export const loginUser = async (credentials) => {
  const res = await api.post("/login", credentials);
  return unwrap(res);
};

export const registerUser = async (userData) => {
  const res = await api.post("/register", userData);
  return unwrap(res);
};

export const getProfile = async () => {
  const res = await api.get("/profile");
  return unwrap(res);
};

export const logoutUser = async () => {
  try {
    await api.post("/logout");
  } catch (e) {
    if (e.response && e.response.status === 401) {
       console.log("Session already expired on server.");
    } else {
       console.warn("Logout failed", e);
    }
  }
};

export const forgotPassword = async (email) => {
  const res = await api.post("/forgot-password", { email });
  return unwrap(res);
};

export const resetPassword = async (email, otp, password) => {
  const res = await api.post("/reset-password", { email, otp, password });
  return unwrap(res);
};