import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * Guards private routes.
 * Eliminates flicker by also trusting localStorage token if Redux hasn't updated yet.
 */
export default function ProtectedRoute() {
  const location = useLocation();
  const token = useSelector((s) => s.auth.token);
  // If Redux hasn't caught up yet but localStorage already has the token (post-login),
  // treat the user as authenticated to avoid the one-frame bounce.
  const effectiveToken = token || localStorage.getItem("token");

  if (!effectiveToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
