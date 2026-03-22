import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDiscoverMeta() {
  return useQuery({
    queryKey: ["discover", "meta"],
    queryFn: async () => {
      const [genresRes, streamingRes] = await Promise.all([
        api.discover.genres(),
        api.discover.streaming(),
      ]);
      return { genres: genresRes.data, streamingServices: streamingRes.data };
    },
    staleTime: 10 * 60 * 1000, // genres/streaming rarely change
  });
}

export function useDiscoverResults(filters: Record<string, any>, enabled = true) {
  return useQuery({
    queryKey: ["discover", "results", filters],
    queryFn: () => api.discover.get(filters as any).then((r) => r),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
