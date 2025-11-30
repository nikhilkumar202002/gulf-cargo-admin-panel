
import { useSelector } from "react-redux";
import SuperAdminPanel from "./Dashboards/SuperAdminPanel";
import StaffDashboard from "./Dashboards/StaffDashboard";
import AgencyDashboard from "./Dashboards/AgencyDashboard";

const dashboardMap = {
  1: SuperAdminPanel, // Super Admin
  2: StaffDashboard,  // Staff
  3: AgencyDashboard, // Agency
};

export default function Dashboard() {
  // read from Redux, not AuthContext
  const { token, user, isInitialized } = useSelector((s) => s.auth || {});
  const isAuthenticated = Boolean(token);

  // While the app is initializing, show a loading state.
  if (!isInitialized) {
    return (
      <p className="text-center text-gray-500 text-lg mt-10">
        Loading...
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <p className="text-center text-red-500 text-lg mt-10">
        Please log in first.
      </p>
    );
  }
  // support multiple possible shapes for role
  const roleId =
    user?.role_id ?? user?.roleId ?? user?.role?.id ?? user?.role ?? null;

  // If user is authenticated but role is not yet loaded, show loading
  if (roleId === null) {
    return (
      <p className="text-center text-gray-500 text-lg mt-10">
        Loading dashboard...
      </p>
    );
  }

  const DashboardComponent = dashboardMap[roleId];

  return DashboardComponent ? (
    <DashboardComponent />
  ) : (
    <h2 className="text-center mt-10 text-red-500 text-xl">
      Unauthorized Access
    </h2>
  );
}
