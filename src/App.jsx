import React, { useEffect, useRef, Suspense, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth, setInitialized, setUser } from "./store/slices/authSlice";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import axiosInstance from "./api/axiosInstance";


const App = memo(function App() {
  const dispatch = useDispatch();
  const { token, status, user, sessionId, isInitialized } = useSelector((s) => s.auth || {});
  const bootstrappedTokenRef = useRef(null);

  const bcRef = useRef(null);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isInitialized) {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            // Validate token by fetching profile
            const profileRes = await axiosInstance.get("/profile", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const user = profileRes.data?.user || profileRes.data?.data || profileRes.data;
            if (user) {
              // Token is valid, set user
              dispatch(setUser(user));
            } else {
              // Invalid token, clear auth
              dispatch(clearAuth());
            }
          } catch (error) {
            // Token invalid or expired, clear auth
            dispatch(clearAuth());
          }
        }
        // Mark as initialized regardless
        dispatch(setInitialized());
      }
    };

    initializeAuth();
  }, [dispatch, isInitialized]);

 // Cross-tab logout & login awareness (same browser profile).
  useEffect(() => {
    // BroadcastChannel for instant tab messaging
    bcRef.current = new BroadcastChannel("auth");
    const bc = bcRef.current;
    bc.onmessage = (e) => {
      if (e?.data === "logout") dispatch(clearAuth());
      if (e?.data?.type === "session-update") {
        const incomingSid = e.data.sessionId;
        if (sessionId && incomingSid && incomingSid !== sessionId) {
          dispatch(clearAuth());
        }
      }
    };

    // storage event fires on other tabs when localStorage changes
    const onStorage = (ev) => {
      if (ev.key === "session_id") {
        if (sessionId && ev.newValue && ev.newValue !== sessionId) {
          dispatch(clearAuth());
        }
      }
      if (ev.key === "token" && !ev.newValue && token) {
        dispatch(clearAuth());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      bc.close();
    };
  }, [dispatch, token, sessionId]);

  return (
    <Suspense fallback={<div style={{ height: 2, background: "#eee" }} />}>
      <RouterProvider router={router} />
    </Suspense>
  );
});

export default App;
