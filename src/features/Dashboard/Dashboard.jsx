import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import SuperAdminPanel from "./SuperAdminPanel";
import StaffDashboard from "./StaffDashboard";
import AgencyDashboard from "./AgencyDashboard";

const dashboardMap = {
  1: SuperAdminPanel,
  2: StaffDashboard, 
  3: AgencyDashboard,
};

export default function Dashboard() {
  const { token, user, isInitialized } = useSelector((s) => s.auth || {});
  
  // 1. Check Init
  if (!isInitialized) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Initializing...</div>;
  }

  // 2. Check Token
  if (!token) {
    return <div className="flex h-screen items-center justify-center text-red-500">Please log in.</div>;
  }

  // 3. ⚠️ CRITICAL FIX: If we have a token but no user, show loading instead of error
  if (token && !user) {
    return (
      <div className="flex h-screen items-center justify-center text-blue-600">
        <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
           {/* Simple spinner icon */}
           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading user profile...
      </div>
    );
  }

  // 4. Extract Role
  let roleId = null;
  if (user) {
    const raw = user.role_id ?? user.roleId ?? (typeof user.role === "object" ? user.role?.id : user.role);
    if (raw != null && !isNaN(Number(raw))) {
      roleId = Number(raw);
    }
  }

  // 5. Render Dashboard or Error
  const DashboardComponent = dashboardMap[roleId];

  return DashboardComponent ? (
    <DashboardComponent />
  ) : (
    <div className="flex h-screen items-center justify-center flex-col">
      <h2 className="text-red-500 text-xl font-bold">Unauthorized Access</h2>
      <p className="text-gray-500 mt-2">Role ID: {roleId ?? "None"}</p>
      <button onClick={()=>window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Reload</button>
    </div>
  );
}