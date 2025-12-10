// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
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
      const loginData = await loginUser(credentials);
      const token = loginData.token || loginData.access_token || loginData.data?.token;

      if (!token) return rejectWithValue("No token received");

      // 1. Save Token
      setTokenStore(token, { persist: true });

      // 2. Fetch User Profile if missing
      let user = loginData.user || loginData.data?.user || loginData.data;
      if (!user || !user.id || !user.role) {
        try {
           const profileData = await getProfile();
           user = profileData.user || profileData.data?.user || profileData;
        } catch (profileErr) {
           console.warn("Profile fetch failed after login", profileErr);
        }
      }

      if (!user) return rejectWithValue("Failed to load user profile");

      // 3. Persist User & Date (For Daily Logout)
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("loginDate", new Date().toDateString());

      return { token, user };
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || err?.message || "Login failed"
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    try {
      // Broadcast logout to other tabs
      const bc = new BroadcastChannel("gulf_cargo_auth");
      bc.postMessage({ type: "LOGOUT" });
      bc.close();
      
      await apiLogout();
    } catch (e) {
      console.warn("Logout API failed", e);
    } finally {
      dispatch(clearAuth());
    }
  }
);

const initialState = {
  token: localStorage.getItem("token") || null,
  user: getUserFromStorage(),
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
    setUser: (state, { payload }) => {
      state.user = payload || null;
      if (payload) localStorage.setItem("user", JSON.stringify(payload));
      else localStorage.removeItem("user");
    },
    clearAuth: (state) => {
      state.token = null;
      state.user = null;
      state.status = "idle";
      state.error = null;
      // Note: We don't reset isInitialized to avoid full app reload flicker
      
      clearTokenStore(); 
      localStorage.removeItem("user");
      localStorage.removeItem("loginDate"); // Clear date so next login sets it fresh
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

export const { setToken, setUser, clearAuth, setInitialized } = slice.actions;
export default slice.reducer;