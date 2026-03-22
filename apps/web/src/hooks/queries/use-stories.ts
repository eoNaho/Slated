import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Query hooks ──────────────────────────────────────────────────────────────

export function useStoriesFeed(page = 1, enabled = true) {
  return useQuery({
    queryKey: ["stories", "feed", page],
    queryFn: () => api.stories.getFeed(page),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useUserStories(username: string, enabled = true) {
  return useQuery({
    queryKey: ["stories", "user", username],
    queryFn: () => api.stories.getByUser(username).then((r) => r.data ?? []),
    enabled: enabled && !!username,
    staleTime: 30 * 1000,
  });
}

export function useStoryById(id: string, enabled = true) {
  return useQuery({
    queryKey: ["stories", id],
    queryFn: () => api.stories.getById(id).then((r) => r.data),
    enabled: enabled && !!id,
    staleTime: 10 * 1000,
  });
}

export function useStoryViewers(storyId: string, enabled = true) {
  return useQuery({
    queryKey: ["stories", storyId, "viewers"],
    queryFn: () => api.stories.getViewers(storyId),
    enabled: enabled && !!storyId,
    staleTime: 15 * 1000,
  });
}

export function useStoryReplies(storyId: string, enabled = true) {
  return useQuery({
    queryKey: ["stories", storyId, "replies"],
    queryFn: () => api.stories.getReplies(storyId).then((r) => r.data ?? []),
    enabled: enabled && !!storyId,
    staleTime: 15 * 1000,
  });
}

export function useStoryArchive(page = 1, enabled = true) {
  return useQuery({
    queryKey: ["stories", "archive", page],
    queryFn: () => api.stories.getArchive(page),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useHighlights(username: string, enabled = true) {
  return useQuery({
    queryKey: ["highlights", username],
    queryFn: () => api.highlights.getByUser(username).then((r) => r.data ?? []),
    enabled: enabled && !!username,
    staleTime: 60 * 1000,
  });
}

export function useHighlightStories(highlightId: string, enabled = true) {
  return useQuery({
    queryKey: ["highlights", highlightId, "stories"],
    queryFn: () => api.highlights.getById(highlightId).then((r) => r.data),
    enabled: enabled && !!highlightId,
    staleTime: 30 * 1000,
  });
}

export function useCloseFriends(enabled = true) {
  return useQuery({
    queryKey: ["close-friends"],
    queryFn: () => api.closeFriends.list().then((r) => r.data ?? []),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useQuestionResponses(storyId: string, enabled = true) {
  return useQuery({
    queryKey: ["stories", storyId, "question-responses"],
    queryFn: () => api.stories.getQuestionResponses(storyId).then((r) => r.data ?? []),
    enabled: enabled && !!storyId,
    staleTime: 15 * 1000,
  });
}

// ── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: string;
      content: Record<string, unknown>;
      expires_at?: string;
      visibility?: string;
      slides?: Record<string, unknown>[];
    }) => api.stories.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories", "feed"] });
    },
  });
}

export function useReplyToStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, text }: { storyId: string; text: string }) =>
      api.stories.react(storyId, "reply", text),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stories", variables.storyId, "replies"] });
    },
  });
}

export function usePollVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, optionIndex }: { storyId: string; optionIndex: number }) =>
      api.stories.pollVote(storyId, optionIndex),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stories", variables.storyId] });
    },
  });
}

export function useReactToStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, reaction }: { storyId: string; reaction: string }) =>
      api.stories.react(storyId, reaction),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stories", variables.storyId] });
    },
  });
}

export function useCreateHighlight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; cover_image_url?: string; story_ids?: string[] }) =>
      api.highlights.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
    },
  });
}

export function useUpdateHighlight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; cover_image_url?: string | null; position?: number }) =>
      api.highlights.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
    },
  });
}

export function useDeleteHighlight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.highlights.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
    },
  });
}

export function useToggleCloseFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ friendId, isCurrently }: { friendId: string; isCurrently: boolean }) =>
      isCurrently ? api.closeFriends.remove(friendId) : api.closeFriends.add(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["close-friends"] });
    },
  });
}

export function useQuizAnswer() {
  return useMutation({
    mutationFn: ({ storyId, answerIndex }: { storyId: string; answerIndex: number }) =>
      api.stories.quizAnswer(storyId, answerIndex),
  });
}

export function useQuestionResponse() {
  return useMutation({
    mutationFn: ({ storyId, response }: { storyId: string; response: string }) =>
      api.stories.questionResponse(storyId, response),
  });
}
