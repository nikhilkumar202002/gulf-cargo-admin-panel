let accessToken = null;

// Store token in localStorage or sessionStorage but not expose directly
export function setToken(token, { persist = false } = {}) {
  accessToken = token || null;
  if (persist) {
    // Store token in localStorage (in background, not exposed)
    localStorage.setItem("token", accessToken || "");
  } else {
    sessionStorage.removeItem("token");
  }
}

export function getToken() {
  return accessToken || localStorage.getItem("token") || sessionStorage.getItem("token") || null;
}

export function clearToken() {
  accessToken = null;
  localStorage.removeItem("token"); // Clear from localStorage
  sessionStorage.removeItem("token"); // Clear from sessionStorage
}
