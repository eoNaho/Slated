import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSearchResults(
  query: string,
  type: string,
  page: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["search", query, type, page],
    queryFn: () =>
      api.search.search(query, { type: type as any, page }).then((r) => r),
    enabled: enabled && !!query,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSearchAutocomplete(query: string) {
  return useQuery({
    queryKey: ["search", "autocomplete", query],
    queryFn: () => api.search.search(query, { type: "all" }).then((r) => r.media ?? []),
    enabled: !!query && query.length > 1,
    staleTime: 30 * 1000,
  });
}
