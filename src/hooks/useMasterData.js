import { useQuery } from "@tanstack/react-query";
import {
  getActiveBranches,
  getShipmentMethods,
  getShipmentStatuses,
  getDeliveryTypes,
  getPaymentMethods,
  getCollectedBy,
  getDrivers
} from "../services/coreService";

// Hook for Branches
export const useBranches = () => {
  return useQuery({
    queryKey: ["branches", "active"],
    queryFn: () => getActiveBranches(),
    staleTime: Infinity, // Never refetch branches during session
  });
};

// Hook for Common Shipment Dropdowns (Parallel Fetch)
export const useShipmentDropdowns = () => {
  return useQuery({
    queryKey: ["shipmentDropdowns"],
    queryFn: async () => {
      const [methods, statuses, paymentMethods, deliveryTypes, roles] = await Promise.all([
        getShipmentMethods({ status: 1 }),
        getShipmentStatuses({ status: 1 }),
        getPaymentMethods(),
        getDeliveryTypes({ status: 1 }),
        getCollectedBy(),
      ]);
      return { methods, statuses, paymentMethods, deliveryTypes, roles };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for Drivers
export const useDrivers = () => {
  return useQuery({
    queryKey: ["drivers", "active"],
    queryFn: () => getDrivers({ status: 1 }),
    staleTime: 1000 * 60 * 5,
  });
};