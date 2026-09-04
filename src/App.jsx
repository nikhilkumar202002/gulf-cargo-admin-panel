// src/App.jsx
import React, { useEffect, useRef, Suspense, memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth, setInitialized, setUser, logoutUser } from "./store/slices/authSlice";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import api from "./services/axios"; 
import { useQueryClient } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary";
import SessionExpiryWarning from "./components/SessionExpiryWarning";

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 Minutes
const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000; // 5 Minutes

let profileValidationRequest = null;
let profileValidationToken = null;

const validateProfileForToken = (storedToken) => {
  if (profileValidationRequest && profileValidationToken === storedToken) {
    return profileValidationRequest;
  }

  profileValidationToken = storedToken;
  const request = api.get("/profile");
  const sharedRequest = request.finally(() => {
    if (profileValidationRequest === sharedRequest) {
      profileValidationRequest = null;
      profileValidationToken = null;
    }
  });
  profileValidationRequest = sharedRequest;

  return profileValidationRequest;
};

const App = memo(function App() {
  const dispatch = useDispatch();
  const { token, isInitialized } = useSelector((s) => s.auth || {});
  const queryClient = useQueryClient();
  
  // Refs for timers and channels
  const idleTimerRef = useRef(null);
  const midnightIntervalRef = useRef(null);
  const bcRef = useRef(null);
  const inactivityDeadlineRef = useRef(null);
  const warningVisibleRef = useRef(false);
  const logoutInProgressRef = useRef(false);
  const checkDeadlineRef = useRef(null);
  const [sessionWarning, setSessionWarning] = React.useState({ open: false, deadline: null });

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
            const profileRes = await validateProfileForToken(storedToken);
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
  const dismissSessionWarning = useCallback(() => {
    warningVisibleRef.current = false;
    setSessionWarning({ open: false, deadline: null });
  }, []);

  const expireSession = useCallback(() => {
    if (!token || logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;
    dismissSessionWarning();
    dispatch(logoutUser());
  }, [dispatch, dismissSessionWarning, token]);

  const scheduleInactivityCheck = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const deadline = inactivityDeadlineRef.current;
    if (!deadline || !token) return;

    const remaining = deadline - Date.now();
    const delay = remaining > SESSION_WARNING_THRESHOLD
      ? remaining - SESSION_WARNING_THRESHOLD
      : Math.min(Math.max(remaining, 250), 1000);
    idleTimerRef.current = setTimeout(() => checkDeadlineRef.current?.(), Math.max(250, delay));
  }, [token]);

  const checkInactivityDeadline = useCallback(() => {
    if (!token || logoutInProgressRef.current) return;

    const deadline = inactivityDeadlineRef.current;
    if (!deadline) return;

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      expireSession();
      return;
    }

    if (remaining <= SESSION_WARNING_THRESHOLD && !warningVisibleRef.current) {
      warningVisibleRef.current = true;
      setSessionWarning({ open: true, deadline });
    }

    scheduleInactivityCheck();
  }, [expireSession, scheduleInactivityCheck, token]);

  useEffect(() => {
    checkDeadlineRef.current = checkInactivityDeadline;
  }, [checkInactivityDeadline]);

  const resetInactivityDeadline = useCallback(() => {
    if (!token || logoutInProgressRef.current) return;
    inactivityDeadlineRef.current = Date.now() + INACTIVITY_LIMIT;
    dismissSessionWarning();
    scheduleInactivityCheck();
  }, [dismissSessionWarning, scheduleInactivityCheck, token]);

  const handleUserActivity = useCallback(() => {
    if (warningVisibleRef.current) return;
    resetInactivityDeadline();
  }, [resetInactivityDeadline]);

  useEffect(() => {
    logoutInProgressRef.current = false;
    if (!token) {
      inactivityDeadlineRef.current = null;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      dismissSessionWarning();
      return undefined;
    }

    resetInactivityDeadline();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [dismissSessionWarning, resetInactivityDeadline, token]);

  useEffect(() => {
    if (!token) return undefined;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, handleUserActivity));

    return () => events.forEach((eventName) => window.removeEventListener(eventName, handleUserActivity));
  }, [handleUserActivity, token]);

  useEffect(() => {
    if (!token) return undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkDeadlineRef.current?.();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [token]);

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
        dismissSessionWarning();
        dispatch(clearAuth());
      }
      if (type === "NEW_TAB_OPENED" && token) {
        console.log("New tab detected. Logging out this instance.");
        dismissSessionWarning();
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
  }, [dispatch, dismissSessionWarning, token]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 px-6"><div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-indigo-100" aria-hidden="true" /><p className="mt-4 text-sm font-medium text-slate-600">Loading application...</p></div></div>}>
        {sessionWarning.open && token && (
          <SessionExpiryWarning
            key={sessionWarning.deadline}
            deadline={sessionWarning.deadline}
            onContinue={resetInactivityDeadline}
            onLogout={expireSession}
          />
        )}
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
});

export default App;
