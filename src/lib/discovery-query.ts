import { queryOptions } from "@tanstack/react-query";
import { loadDiscovery } from "./discovery.functions";

export const discoveryQuery = (userId: string) => queryOptions({
  queryKey: ["discovery", userId], queryFn: () => loadDiscovery(), staleTime: 30_000,
});