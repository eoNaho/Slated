import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Conversation, Message } from "@/types";

export function useConversations(enabled = true) {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.messages.listConversations(),
    enabled,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000, // poll until WebSocket is added
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ["conversation", id],
    queryFn: () => api.messages.getConversation(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) =>
      api.messages.getMessages(conversationId!, {
        limit: 30,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!conversationId,
    staleTime: 5 * 1000,
  });
}

export function useUnreadDmCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["messages", "unread-count"],
    queryFn: () => api.messages.getUnreadCount().then((r) => r.count),
    enabled: !!userId,
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useDmSettings(enabled = true) {
  return useQuery({
    queryKey: ["dm-settings"],
    queryFn: () => api.messages.getSettings(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Optimistically appends a message to the local cache after sending. */
export function useAppendMessage() {
  const queryClient = useQueryClient();
  return (conversationId: string, message: Message) => {
    queryClient.setQueryData(
      ["messages", conversationId],
      (old: ReturnType<typeof useInfiniteQuery>["data"]) => {
        if (!old) return old;
        const pages = [...(old as { pages: { data: Message[] }[] }).pages];
        if (pages.length > 0) {
          pages[pages.length - 1] = {
            ...pages[pages.length - 1],
            data: [...pages[pages.length - 1].data, message],
          };
        }
        return { ...(old as object), pages };
      }
    );
    // Invalidate inbox to update lastMessagePreview + order
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };
}

/** Invalidates the conversations list (used after sending or receiving a message). */
export function useInvalidateConversations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["conversations"] });
}
