import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useWatchlist(enabled = true) {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: () => api.watchlist.list(),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
