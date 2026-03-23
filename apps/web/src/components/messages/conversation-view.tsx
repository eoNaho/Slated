"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useConversation, useMessages } from "@/hooks/queries/use-messages";
import { useWsContext } from "@/providers/websocket-provider";
import { ConversationHeader } from "./conversation-header";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import type { Message } from "@/types";

interface ConversationViewProps {
  conversationId: string;
  /** Hide the built-in ConversationHeader (e.g. when embedded in the mini panel). */
  hideHeader?: boolean;
}

export function ConversationView({ conversationId, hideHeader = false }: ConversationViewProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const { data: conversation, isLoading: convLoading } =
    useConversation(conversationId);

  const {
    data: messagesData,
    isLoading: msgLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  // typingUsers: map of userId → display name of who is currently typing
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const handleTyping = useCallback(
    (convId: string, userId: string, isTyping: boolean) => {
      if (convId !== conversationId || userId === currentUserId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (isTyping) {
          // Get display name from conversation participants
          const participant = conversation?.participants?.find(
            (p) => p.userId === userId
          );
          next.set(userId, participant?.displayName ?? participant?.username ?? "...");
        } else {
          next.delete(userId);
        }
        return next;
      });

      // Auto-clear after 4s of no update (safety net if stop_typing is missed)
      const existing = typingTimeoutsRef.current.get(userId);
      if (existing) clearTimeout(existing);

      if (isTyping) {
        const t = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
          typingTimeoutsRef.current.delete(userId);
        }, 4000);
        typingTimeoutsRef.current.set(userId, t);
      } else {
        typingTimeoutsRef.current.delete(userId);
      }
    },
    [conversationId, currentUserId, conversation?.participants]
  );

  const { send: wsSend, subscribeTyping } = useWsContext();

  useEffect(() => {
    return subscribeTyping(handleTyping);
  }, [subscribeTyping, handleTyping]);

  const listRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Flatten pages into a single chronological array
  const allMessages: Message[] = messagesData
    ? [...messagesData.pages].reverse().flatMap((p) => p.data)
    : [];

  // Mark as read on mount
  useEffect(() => {
    api.messages.markRead(conversationId).catch((e) => console.warn("Failed to mark as read", e));
  }, [conversationId]);

  // Auto-scroll to bottom on first load and new messages.
  // Use scrollTo on the container instead of scrollIntoView — scrollIntoView
  // scrolls the entire page, not just the message list.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (isFirstLoad.current && allMessages.length > 0) {
      el.scrollTop = el.scrollHeight;
      isFirstLoad.current = false;
    } else if (!isFirstLoad.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [allMessages.length]);

  // Clean up typing timeouts on unmount
  useEffect(() => {
    const timeouts = typingTimeoutsRef.current;
    return () => {
      for (const t of timeouts.values()) clearTimeout(t);
    };
  }, []);

  // Load older messages when scrolled to top
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (convLoading || msgLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Conversa não encontrada.
      </div>
    );
  }

  const typingNames = [...typingUsers.values()];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      {!hideHeader && <ConversationHeader conversation={conversation} />}

      {/* Message list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 flex flex-col"
      >
        {/* Load more trigger */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
          </div>
        )}

        {hasNextPage && !isFetchingNextPage && (
          <button
            onClick={() => fetchNextPage()}
            className="mx-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2 px-4 rounded-lg hover:bg-white/5"
          >
            Carregar mensagens anteriores
          </button>
        )}

        {/* Messages */}
        {allMessages.map((message, index) => {
          const isMine = message.senderId === currentUserId;
          const prevMsg = allMessages[index - 1];
          const showAvatar =
            !isMine &&
            (index === 0 || prevMsg?.senderId !== message.senderId);

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={isMine}
              showAvatar={showAvatar}
            />
          );
        })}

        {allMessages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Nenhuma mensagem ainda. Diga olá!
          </div>
        )}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="flex items-center gap-1 bg-zinc-800/80 rounded-2xl px-3 py-2">
              {/* Animated dots */}
              <span className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="text-xs text-zinc-400 ml-1">
                {typingNames.length === 1
                  ? `${typingNames[0]} está digitando`
                  : `${typingNames.length} pessoas estão digitando`}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Input */}
      <MessageInput conversationId={conversationId} wsSend={wsSend} />
    </div>
  );
}
