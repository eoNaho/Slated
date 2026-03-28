import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.notifications.list().then((r) => r.data),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        credentials: "include",
      });
      if (!res.ok) return 0;
      const json = await res.json();
      return (json?.data?.count as number) ?? 0;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // poll every 1 min (fallback when WS is down)
  });
}
