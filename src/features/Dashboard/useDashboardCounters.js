import { useQuery } from "@tanstack/react-query";
import { getCounters } from "../../services/coreService";
import { normalizeDashboardCounters } from "./dashboardData";

export const dashboardCountersKey = ["dashboard", "counters"];

export default function useDashboardCounters() {
  return useQuery({
    queryKey: dashboardCountersKey,
    queryFn: getCounters,
    select: normalizeDashboardCounters,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
