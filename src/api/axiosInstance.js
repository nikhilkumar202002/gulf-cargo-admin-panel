import axios from "axios";
import { getToken, clearToken } from "../auth/tokenStore";

const startTokenValidation = () => {
  setInterval(async () => {
    const token = getToken();
    if (token) {
      try {
        // Make a lightweight API call to validate the token.
        // The response interceptor will handle 401 errors and log the user out.
        // We add `noCache` to ensure we are hitting the server and not getting a stale cached response.
        await axiosInstance.get("/profile", { params: { noCache: true } });
      } catch (error) {
        // The response interceptor already handles the 401 error,
        // so we can safely ignore the rejection here. This catch block
        // prevents unhandled promise rejection warnings in the console.
      }
    }
  }, 5000); // Check every 5 seconds
};

startTokenValidation();

export const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "https://developmentapi.gulfcargoksa.com/public/api";

// Hard-fail in production if API is not HTTPS
if (import.meta.env.PROD) {
  const proto = new URL(baseURL).protocol;
  if (proto !== "https:") {
    throw new Error(`Insecure API baseURL: ${baseURL}`);
  }
}

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (config) => `${config.method?.toUpperCase()}_${config.url}_${JSON.stringify(config.params || {})}`;
const isCacheable = (config) => config.method?.toLowerCase() === 'get' && !config.params?.noCache;

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000, // Reduced from 15000 to 10000 for better performance
  withCredentials: false,
  headers: { Accept: "application/json" },
});

export const clearCache = () => cache.clear();

// Optional anonymous session ID (non-sensitive) stored in sessionStorage for security
const ensureSessionId = () => {
  try {
    let sid = sessionStorage.getItem("session_id"); // Use sessionStorage instead of localStorage
    if (!sid) {
      sid =
        (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) +
        Date.now().toString(36);
      sessionStorage.setItem("session_id", sid); // Store in sessionStorage
    }
    return sid;
  } catch {
    return "anon";
  }
};

// Request interceptor to add Authorization header and caching
axiosInstance.interceptors.request.use(
  (config) => {
    // Caching logic for GET requests
    if (isCacheable(config)) {
      const key = getCacheKey(config);
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        // If a valid cache entry is found, throw an error to cancel the request
        // and use the cached data in the response interceptor's error handler.
        const error = new Error("Request served from cache.");
        error.cachedData = cached.data;
        throw error;
      }
    }

    const token = getToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach session ID header
    config.headers["X-Client-Session"] = ensureSessionId();

    // Handle multipart form data by letting the browser set the boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authorization errors and caching
axiosInstance.interceptors.response.use(
  (res) => {
    // Cache successful GET responses
    if (isCacheable(res.config)) {
      const key = getCacheKey(res.config);
      cache.set(key, { data: res.data, timestamp: Date.now() });
    }
    return res;
  },
  (error) => {
    // If the error was thrown to serve a cached response, resolve with the cached data.
    if (error.cachedData) {
      // Fulfills the request with cached data, marking it as such.
      return Promise.resolve({ data: error.cachedData, cached: true });
    }

    const status = error?.response?.status;
    if (status === 401) {
      // Handle unauthorized requests, clear the token, and trigger logout
      try {
        clearToken?.();
        // Dispatch the event for the app to react (e.g., navigate to login)
        window.dispatchEvent(new Event("auth:unauthorized"));
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
