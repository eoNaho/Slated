import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMediaState(mediaId: string, enabled = true) {
  return useQuery({
    queryKey: ["media", mediaId, "state"],
    queryFn: () => api.media.getState(mediaId).then((r) => r.data),
    enabled: enabled && !!mediaId,
    staleTime: 30 * 1000,
  });
}
