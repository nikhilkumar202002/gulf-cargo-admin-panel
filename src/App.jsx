// src/App.jsx
import React, { useEffect, useRef, Suspense, memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth, setInitialized, setUser, logoutUser } from "./store/slices/authSlice";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import api from "./services/axios"; 
import { useQueryClient } from "@tanstack/react-query";

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 Minutes

const App = memo(function App() {
  const dispatch = useDispatch();
  const { token, isInitialized } = useSelector((s) => s.auth || {});
  const queryClient = useQueryClient();
  
  // Refs for timers and channels
  const idleTimerRef = useRef(null);
  const midnightIntervalRef = useRef(null);
  const bcRef = useRef(null);

  // --- [FIX] Clear React Query Cache on Logout ---
  useEffect(() => {
    if (!token) {
      queryClient.removeQueries();
      queryClient.clear();
    }
  }, [token, queryClient]);

  // --- 1. Session & API Initialization ---
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isInitialized) {
        const storedToken = localStorage.getItem("token");
        const loginDate = localStorage.getItem("loginDate");
        const today = new Date().toDateString();

        // A. Check if the app was loaded on a new day (Initial Check)
        if (loginDate && loginDate !== today) {
          console.log("New day detected (on load). Clearing session.");
          dispatch(logoutUser());
          queryClient.clear(); 
          localStorage.clear(); 
          dispatch(setInitialized());
          return;
        }

        // B. Validate Token
        if (storedToken) {
          try {
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

  // --- 2. Midnight Auto-Logout (Every Timezone) ---
  useEffect(() => {
    if (!token) {
        if (midnightIntervalRef.current) clearInterval(midnightIntervalRef.current);
        return;
    }

    // Check every 1 minute if the date has changed
    midnightIntervalRef.current = setInterval(() => {
        const loginDate = localStorage.getItem("loginDate");
        const currentDate = new Date().toDateString();

        if (loginDate && loginDate !== currentDate) {
            console.log("Midnight crossed. Logging out.");
            alert("It is past midnight. You have been logged out for security.");
            dispatch(logoutUser());
        }
    }, 60000); // 60 seconds

    return () => {
        if (midnightIntervalRef.current) clearInterval(midnightIntervalRef.current);
    };
  }, [token, dispatch]);


  // --- 3. Inactivity Timer (30 Mins) ---
  const handleUserActivity = useCallback(() => {
    if (!token) return;
    
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      console.log("User inactive for 30 mins. Logging out.");
      dispatch(logoutUser());
      alert("Session expired due to inactivity.");
    }, INACTIVITY_LIMIT);
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, handleUserActivity));

    handleUserActivity();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleUserActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [token, handleUserActivity]);

  // --- 4. Cross-Tab / Single Tab Enforcement ---
  useEffect(() => {
    bcRef.current = new BroadcastChannel("gulf_cargo_auth");
    const bc = bcRef.current;

    if (token) {
      bc.postMessage({ type: "NEW_TAB_OPENED" });
    }

    bc.onmessage = (e) => {
      const { type } = e.data;
      if (type === "LOGOUT") {
        dispatch(clearAuth());
      }
      if (type === "NEW_TAB_OPENED" && token) {
        console.log("New tab detected. Logging out this instance.");
        dispatch(clearAuth()); 
      }
    };

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