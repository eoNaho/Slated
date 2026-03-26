import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function useCustomCovers(
  username: string | undefined,
  initialData?: Record<string, string>,
) {
  return useQuery<Record<string, string>>({
    queryKey: ["user", username, "custom-covers"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users/${username}/custom-covers`);
      if (!res.ok) return {};
      const json = await res.json();
      return json.data ?? {};
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    initialData,
  });
}
