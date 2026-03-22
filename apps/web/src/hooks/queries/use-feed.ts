import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePersonalFeed(page = 1, enabled = true) {
  return useQuery({
    queryKey: ["feed", "personal", page],
    queryFn: () => api.feed.getPersonal(page),
    enabled,
    staleTime: 60 * 1000,
  });
}
