// api/dashboardCountersApi.js
import { getAllDashboardCounts, getActiveUsersCount } from "./coutersApi";

export const getCounters = async () => {
  const [counts, activeUsers] = await Promise.all([
    getAllDashboardCounts(),
    getActiveUsersCount(),
  ]);

  return {
    totalStaff: counts.staff,
    totalBranches: counts.branches,
    totalConsignees: counts.senders,
    totalReceivers: counts.receivers,
    softwareShipmentsToday: counts.software,
    physicalShipmentsToday: counts.physical,
    outForDelivery: counts.outForDelivery,
    enquiriesCollected: counts.enquiriesCollected,
    waitingForClearance: counts.waitingForClearance,
    activeUsers: activeUsers,
    // These seem to be unused now, but I'll leave them as 0
    staffPresent: 0,
    staffAbsent: 0,
    staffPartial: 0,
    movingPending: 0,
  };
};
