import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const { token, isInitialized } = useSelector((s) => s.auth || {});
  const isAuthenticated = Boolean(token);
  const loading = !isInitialized;

  // ✅ Prevent flicker while checking auth
  if (loading) {
    return <div className="loader">Checking authentication...</div>;
  }

  // If not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
