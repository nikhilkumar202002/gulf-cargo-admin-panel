import axios from "axios";
import { getToken, clearToken } from "../auth/tokenStore";

// 1. Base URL Configuration
const baseURL = import.meta.env.VITE_API_BASE_URL || "https://api.gulfcargoksa.com/public/api";

// 2. Create Axios Instance
const api = axios.create({
  baseURL,
  timeout: 20000, // 20 seconds timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 3. Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    // Return successful response
    return response;
  },
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      try {

        clearToken();
        window.dispatchEvent(new Event("auth:unauthorized"));

      } catch (e) {
        console.error("Error clearing token:", e);
      }
    }

    return Promise.reject(error);
  }
);

export default api;