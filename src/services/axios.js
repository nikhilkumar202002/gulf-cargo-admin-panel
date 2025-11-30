import axios from "axios";
import { getToken, clearToken } from "../auth/tokenStore";

// 1. Base URL Configuration
const baseURL = import.meta.env.VITE_API_BASE_URL || "https://developmentapi.gulfcargoksa.com/public/api";

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
    // Attach Token
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Fix for File Uploads (FormData)
    // If sending a file, delete 'Content-Type' so the browser can set the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 4. Response Interceptor
api.interceptors.response.use(
  (response) => {
    // Return successful response
    return response;
  },
  (error) => {
    const status = error.response?.status;

    // Global 401 Handling (Auto-Logout)
    if (status === 401) {
      try {
        clearToken(); // Remove invalid token from storage
        // Trigger logout event for UI to redirect to login
        window.dispatchEvent(new Event("auth:unauthorized"));
      } catch (e) {
        console.error("Error clearing token:", e);
      }
    }

    // Reject promise so components can handle specific errors (e.g., showing toasts)
    return Promise.reject(error);
  }
);

export default api;