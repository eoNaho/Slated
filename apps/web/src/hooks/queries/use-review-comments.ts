import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useReviewComments(reviewId: string, enabled = true) {
  return useQuery({
    queryKey: ["comments", "review", reviewId],
    queryFn: () => api.comments.list("review", reviewId).then((r) => r.data ?? []),
    enabled: enabled && !!reviewId,
    staleTime: 60 * 1000,
  });
}
