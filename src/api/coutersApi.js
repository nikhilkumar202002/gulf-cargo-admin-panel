// countersApi.js
import axiosInstance from "./axiosInstance";

/**
 * Fetch shipment counts (software, physical, total)
 * Endpoint: /shipments-counts
 */
export const getShipmentCounts = async () => {
  try {
    const { data } = await axiosInstance.get("/shipments-counts");
    if (data.success) {
      return {
        software: data.software_count || 0,
        physical: data.physical_count || 0,
        total: data.total_count || 0,
      };
    }
    return { software: 0, physical: 0, total: 0 };
  } catch (error) {
    console.error("Error fetching shipment counts:", error);
    return { software: 0, physical: 0, total: 0 };
  }
};

/**
 * Fetch user count by role
 * role_id: 1 = Super Admin, 2 = Staff
 * Example: /user-counts?role_id=2
 */
export const getUserCountByRole = async (roleId) => {
  try {
    const { data } = await axiosInstance.get(`/user-counts?role_id=${roleId}`);
    return data.count || 0;
  } catch (error) {
    console.error(`Error fetching user count for role ${roleId}:`, error);
    return 0;
  }
};

/**
 * Fetch sender count
 * Endpoint: /parties/count/customer-type/1
 */
export const getSenderCount = async () => {
  try {
    const { data } = await axiosInstance.get("/parties/count/customer-type/1");
    return data.count || 0;
  } catch (error) {
    console.error("Error fetching sender count:", error);
    return 0;
  }
};

/**
 * Fetch receiver count
 * Endpoint: /parties/count/customer-type/2
 */
export const getReceiverCount = async () => {
  try {
    const { data } = await axiosInstance.get("/parties/count/customer-type/2");
    return data.count || 0;
  } catch (error) {
    console.error("Error fetching receiver count:", error);
    return 0;
  }
};

export const getBranchCount = async () => {
  try {
    const { data } = await axiosInstance.get("/branches-counts");
    return data.total_count || 0;
  } catch (error) {
    console.error("Error fetching branch count:", error);
    return 0;
  }
};

/**
 * Fetch active users count (concurrent users)
 * Endpoint: /active-users
 */
export const getActiveUsersCount = async () => {
  try {
    const { data } = await axiosInstance.get("/active-users");
    return data.count || 0;
  } catch (error) {
    console.error("Error fetching active users count:", error);
    return 0;
  }
};

/**
 * Fetch shipment counts by status
 * Endpoint: /shipments/count/status
 */
export const getShipmentCountsByStatus = async () => {
  try {
    const { data } = await axiosInstance.get("/shipments/count/status");
    if (!data.success) {
      return { outForDelivery: 0, enquiriesCollected: 0, waitingForClearance: 0 };
    }

    const findCount = (breakdown, statusId) => {
      const status = breakdown.find((s) => s.status_id === statusId);
      return status ? parseInt(status.count, 10) || 0 : 0;
    };

    const cargoBreakdown = data.cargo_shipments?.status_breakdown || [];
    const physicalBreakdown = data.physical_shipments?.status_breakdown || [];

    const outForDelivery = findCount(cargoBreakdown, 9) + findCount(physicalBreakdown, 9);
    const enquiriesCollected = findCount(cargoBreakdown, 13) + findCount(physicalBreakdown, 13);
    const waitingForClearance = findCount(cargoBreakdown, 5) + findCount(physicalBreakdown, 5);

    return { outForDelivery, enquiriesCollected, waitingForClearance };
  } catch (error) {
    console.error("Error fetching shipment counts by status:", error);
    return { outForDelivery: 0, enquiriesCollected: 0, waitingForClearance: 0 };
  }
};

/**
 * Fetch all dashboard counts together
 * Combines shipments, user, sender, receiver counts
 */
export const getAllDashboardCounts = async () => {
  try {
    const [shipments, staffCount, senderCount, receiverCount, branchCount, statusCounts] = await Promise.all([
      getShipmentCounts(),
      getUserCountByRole(2), // Staff role
      getSenderCount(),
      getReceiverCount(),
      getBranchCount(),
      getShipmentCountsByStatus(),
    ]);

    return {
      software: shipments.software,
      physical: shipments.physical,
      totalShipments: shipments.total,
      staff: staffCount,
      senders: senderCount,
      receivers: receiverCount,
      branches: branchCount,
      outForDelivery: statusCounts.outForDelivery,
      enquiriesCollected: statusCounts.enquiriesCollected,
      waitingForClearance: statusCounts.waitingForClearance,
    };
  } catch (error) {
    console.error("Error fetching all dashboard counts:", error);
    return {
      software: 0,
      physical: 0,
      totalShipments: 0,
      staff: 0,
      senders: 0,
      receivers: 0,
      branches: 0,
      outForDelivery: 0,
      enquiriesCollected: 0,
      waitingForClearance: 0,
    };
  }
};
