import { useQuery } from "@tanstack/react-query";
import { identityApi } from "@/lib/api";

export function useIdentityData(enabled = true) {
  return useQuery({
    queryKey: ["identity", "me"],
    queryFn: async () => {
      const [id, fr, ti] = await Promise.all([
        identityApi.getMe(),
        identityApi.getFrames(),
        identityApi.getTitles(),
      ]);
      return { identity: id.data, frames: fr.data, titles: ti.data };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
