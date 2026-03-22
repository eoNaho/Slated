import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function useScrobbleStats(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["activity", "stats", userId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/activity/stats/${userId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data ?? null;
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
