import { useQueries, useQuery } from "@tanstack/react-query";
import {
  getActiveBranches,
  getShipmentMethods,
  getShipmentStatuses,
  getPorts,
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
  const queries = useQueries({
    queries: [
      { queryKey: ["shipmentMethods", "active"], queryFn: () => getShipmentMethods({ status: 1 }), staleTime: 1000 * 60 * 15 },
      { queryKey: ["shipmentStatuses", "active"], queryFn: () => getShipmentStatuses({ status: 1 }), staleTime: 1000 * 60 * 15 },
      { queryKey: ["paymentMethods", "active"], queryFn: () => getPaymentMethods(), staleTime: 1000 * 60 * 15 },
      { queryKey: ["deliveryTypes", "active"], queryFn: () => getDeliveryTypes({ status: 1 }), staleTime: 1000 * 60 * 15 },
      { queryKey: ["collectedBy", "active"], queryFn: () => getCollectedBy(), staleTime: 1000 * 60 * 15 },
      { queryKey: ["ports", "active"], queryFn: () => getPorts(), staleTime: 1000 * 60 * 15 },
    ],
  });

  return {
    data: {
      methods: queries[0].data || [],
      statuses: queries[1].data || [],
      paymentMethods: queries[2].data || [],
      deliveryTypes: queries[3].data || [],
      roles: queries[4].data || [],
      ports: queries[5].data || [],
    },
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  };
};

// Hook for Drivers
export const useDrivers = () => {
  return useQuery({
    queryKey: ["drivers", "active"],
    queryFn: () => getDrivers({ status: 1 }),
    staleTime: 1000 * 60 * 5,
  });
};

export const useShipmentMethods = () => {
  return useQuery({
    queryKey: ["shipmentMethods", "active"],
    queryFn: () => getShipmentMethods({ status: 1 }),
    staleTime: 1000 * 60 * 15,
  });
};

export const useShipmentStatuses = () => {
  return useQuery({
    queryKey: ["shipmentStatuses", "active"],
    queryFn: () => getShipmentStatuses({ status: 1 }),
    staleTime: 1000 * 60 * 15,
  });
};
