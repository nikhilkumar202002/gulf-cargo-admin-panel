import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// 👇 Import getProfile
import { loginUser, logoutUser as apiLogout, getProfile } from "../../services/authService";
import { setToken as setTokenStore, clearToken as clearTokenStore } from "../../auth/tokenStore";

const getUserFromStorage = () => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined" || stored === "null") return null;
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      // 1. Login to get Token
      const loginData = await loginUser(credentials);
      const token = loginData.token || loginData.access_token || loginData.data?.token;

      if (!token) return rejectWithValue("No token received");

      // 2. Save Token Immediately so subsequent requests work
      setTokenStore(token, { persist: true });

      // 3. Get User Data (Fetch profile if not in login response)
      let user = loginData.user || loginData.data?.user || loginData.data;
      
      // ⚠️ CRITICAL FIX: If user is missing or incomplete, fetch profile manually
      if (!user || !user.id || !user.role) {
        try {
           const profileData = await getProfile();
           // Handle nested structure like { data: { user: ... } } or { user: ... }
           user = profileData.user || profileData.data?.user || profileData;
        } catch (profileErr) {
           console.warn("Profile fetch failed after login", profileErr);
        }
      }

      if (!user) return rejectWithValue("Failed to load user profile");

      // 4. Persist User
      localStorage.setItem("user", JSON.stringify(user));

      return { token, user };
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || err?.message || "Login failed"
      );
    }
  }
);

// ... (Keep logoutUser and the rest of the slice exactly as they were) ...

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    try {
      await apiLogout();
    } finally {
      dispatch(clearAuth());
    }
  }
);

const initialState = {
  token: localStorage.getItem("token") || null,
  user: getUserFromStorage(),
  sessionId: localStorage.getItem("session_id") || null,
  status: "idle",
  error: null,
  isInitialized: false,
};

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, { payload }) => {
      state.token = payload;
      setTokenStore(payload, { persist: true });
    },
    setSessionId: (state, { payload }) => {
      state.sessionId = payload || null;
      if (payload) localStorage.setItem("session_id", payload);
      else localStorage.removeItem("session_id");
    },
    setUser: (state, { payload }) => {
      state.user = payload || null;
      if (payload) localStorage.setItem("user", JSON.stringify(payload));
      else localStorage.removeItem("user");
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      state.sessionId = null;
      state.status = "idle";
      state.error = null;
      state.isInitialized = false;
      
      clearTokenStore(); 
      localStorage.removeItem("user");
      localStorage.removeItem("session_id");
    },
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.status = "succeeded";
        state.token = payload.token;
        state.user = payload.user;
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.status = "failed";
        state.error = payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = "idle";
      });
  },
});

export const { setToken, setUser, clearAuth, setInitialized, setSessionId } = slice.actions;
export default slice.reducer;