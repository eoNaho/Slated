import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function useApiTokens(enabled = true) {
  return useQuery({
    queryKey: ["activity", "tokens"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/activity/tokens`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data?.data ?? [];
    },
    enabled,
  });
}
