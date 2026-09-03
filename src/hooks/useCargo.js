import { useQuery } from "@tanstack/react-query";
import { getCargoById } from "../services/cargoService";

export const cargoDetailKey = (cargoId) => ["cargo", cargoId];
export const cargoDetailStaleTime = 1000 * 60 * 2;

export const useCargo = (cargoId) => {
  return useQuery({
    queryKey: cargoDetailKey(cargoId),
    queryFn: () => getCargoById(cargoId),
    enabled: Boolean(cargoId),
    staleTime: cargoDetailStaleTime,
  });
};
