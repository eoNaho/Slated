import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useUserLists(
  userId: string | undefined,
  mediaId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["lists", "user", userId, mediaId],
    queryFn: () =>
      api.lists
        .get({ user_id: userId!, limit: 100, membership_media_id: mediaId })
        .then((r) => r.data),
    enabled: enabled && !!userId,
    staleTime: 60 * 1000,
  });
}

export function useListDetail(username: string, slug: string, enabled = true) {
  return useQuery({
    queryKey: ["list", username, slug],
    queryFn: () => api.lists.getBySlug(username, slug).then((r) => r),
    enabled: enabled && !!username && !!slug,
    staleTime: 60 * 1000,
  });
}
