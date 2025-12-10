// src/App.jsx
import React, { useEffect, useRef, Suspense, memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth, setInitialized, setUser, logoutUser } from "./store/slices/authSlice";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
// FIXED: Correct import path pointing to your existing service
import api from "./services/axios"; 
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

const INACTIVITY_LIMIT = 5 * 60 * 1000; // 30 Minutes

const App = memo(function App() {
  const dispatch = useDispatch();
  const { token, isInitialized } = useSelector((s) => s.auth || {});
  const queryClient = useQueryClient();
  
  // Refs for timers and channels
  const idleTimerRef = useRef(null);
  const bcRef = useRef(null);

  // --- 1. Session & API Initialization ---
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isInitialized) {
        const storedToken = localStorage.getItem("token");
        const loginDate = localStorage.getItem("loginDate");
        const today = new Date().toDateString();

        // A. Daily Logout / Cache Clear Check
        if (loginDate && loginDate !== today) {
          console.log("New day detected. Clearing session and cache.");
          dispatch(logoutUser());
          queryClient.clear(); 
          localStorage.clear(); // Or specific keys
          dispatch(setInitialized());
          return;
        }

        // B. Validate Token
        if (storedToken) {
          try {
            // Attach token to instance just in case
            api.defaults.headers.Authorization = `Bearer ${storedToken}`;
            const profileRes = await api.get("/profile");
            const user = profileRes.data?.user || profileRes.data?.data || profileRes.data;
            
            if (user) {
              dispatch(setUser(user));
            } else {
              dispatch(clearAuth());
            }
          } catch (error) {
            console.error("Token validation failed:", error);
            dispatch(clearAuth());
          }
        } else {
          dispatch(clearAuth());
        }
        dispatch(setInitialized());
      }
    };

    initializeAuth();
  }, [dispatch, isInitialized, queryClient]);

  // --- 2. Inactivity Timer (30 Mins) ---
  const handleUserActivity = useCallback(() => {
    if (!token) return;
    
    // Reset timer on activity
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      console.log("User inactive for 30 mins. Logging out.");
      dispatch(logoutUser());
      alert("Session expired due to inactivity.");
    }, INACTIVITY_LIMIT);
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return;

    // Listen for activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, handleUserActivity));

    // Initialize timer
    handleUserActivity();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleUserActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [token, handleUserActivity]);

  // --- 3. Cross-Tab / Single Tab Enforcement ---
  useEffect(() => {
    bcRef.current = new BroadcastChannel("gulf_cargo_auth");
    const bc = bcRef.current;

    if (token) {
      // Tell other tabs a new session is active here
      bc.postMessage({ type: "NEW_TAB_OPENED" });
    }

    bc.onmessage = (e) => {
      const { type } = e.data;

      // If another tab logs out, we logout
      if (type === "LOGOUT") {
        dispatch(clearAuth());
      }

      // If another tab opened (Single Tab Enforcement), logout this old one
      if (type === "NEW_TAB_OPENED" && token) {
        console.log("New tab detected. Logging out this instance.");
        // Optional: Show UI overlay instead of immediate hard logout if preferred
        dispatch(clearAuth()); 
      }
    };

    // Listen to localStorage changes (fallback for some browsers)
    const onStorage = (ev) => {
      if (ev.key === "token" && !ev.newValue && token) {
        dispatch(clearAuth());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      bc.close();
    };
  }, [dispatch, token]);

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
});

export default App;