import { useQuery } from "@tanstack/react-query";

import type { Club } from "@/lib/queries/clubs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function useUserClubs(username: string, enabled = true) {
  return useQuery<Club[]>({
    queryKey: ["user", username, "clubs"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users/${username}/clubs`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: enabled && !!username,
    staleTime: 2 * 60 * 1000,
  });
}
