import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMediaRecommendations(
  params: { limit?: number; includeScores?: boolean } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["recommendations", "media", params],
    queryFn: () => api.recommendations.getMedia(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserRecommendations(
  params: { limit?: number } = {},
  enabled = true
) {
  return useQuery({
    queryKey: ["recommendations", "users", params],
    queryFn: () => api.recommendations.getUsers(params),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useRankedFeed(params: { limit?: number } = {}, enabled = true) {
  return useQuery({
    queryKey: ["recommendations", "feed", params],
    queryFn: () => api.recommendations.getFeed(params),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTasteProfile(enabled = true) {
  return useQuery({
    queryKey: ["recommendations", "taste-profile"],
    queryFn: () => api.recommendations.getTasteProfile(),
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}

export function useRecommendationExplanations(
  mediaIds: string[],
  enabled = true
) {
  return useQuery({
    queryKey: ["recommendations", "explanations", mediaIds],
    queryFn: () => api.recommendations.getExplanations(mediaIds),
    enabled: enabled && mediaIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOnboardingStatus(enabled = true) {
  return useQuery({
    queryKey: ["recommendations", "onboarding-status"],
    queryFn: () => api.recommendations.getOnboardingStatus(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecommendationFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      targetType: "media" | "user";
      targetId: string;
      feedbackType: "not_interested" | "loved_it" | "already_seen" | "not_my_taste";
      source?: string;
      context?: string;
    }) => api.recommendations.submitFeedback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations", "media"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations", "users"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations", "feed"] });
    },
  });
}

export function useSubmitOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { selectedGenreIds: number[]; seedMediaIds: string[] }) =>
      api.recommendations.submitOnboarding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}
