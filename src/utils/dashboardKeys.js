// Useful keys for displaying in StaffDashboard and SuperAdminPanel (SuperAdminDashboard)
// These are the key metrics (KPIs) extracted from the dashboard components.
// For StaffDashboard: Focused on personal tasks, team attendance, and assigned shipments.
// For SuperAdminPanel: Focused on high-level KPIs, revenue, and operational metrics.

export const staffDashboardKeys = {
  summaryCards: [
    "Today's Tasks",
    "Pending Approvals",
    "Assigned Shipments",
    "Total Team Members",
  ],
  staffAttendance: [
    "Present",
    "Absent",
    "On Leave",
    "Shift Change",
  ],
  assignedCargo: [
    "Date",
    "Shipment ID",
    "Destination",
    "Status",
    "Type",
  ],
};

export const superAdminDashboardKeys = {
  majorKPIs: [
    "Shipments Today",
    "On-Time Delivery %",
    "Exceptions Open",
    "Revenue",
    "Total Staffs",
    "Senders",
    "Out for Delivery",
    "Pending Dispatch",
  ],
  staffAttendance: [
    "Present",
    "Absent",
    "Partial",
    "Moving Pending",
  ],
  cargoMovementOverview: [
    "Receiver",
    "Out for Delivery",
    "Waiting for Clearance",
    "Enquiries Collected",
  ],
};

export default { staffDashboardKeys, superAdminDashboardKeys };
