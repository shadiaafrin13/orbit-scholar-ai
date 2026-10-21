import { queryOptions } from "@tanstack/react-query";
import { loadDiscovery, loadCountryDirectory } from "./discovery.functions";

export const discoveryQuery = (userId: string) => queryOptions({
  queryKey: ["discovery", userId], queryFn: () => loadDiscovery(), staleTime: 30_000,
});

export const countryDirectoryQuery = (userId: string) => queryOptions({
  queryKey: ["country-directory", userId], queryFn: () => loadCountryDirectory(), staleTime: 60_000,
});