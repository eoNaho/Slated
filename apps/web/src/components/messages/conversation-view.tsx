"use client";

import { useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useConversation, useMessages } from "@/hooks/queries/use-messages";
import { ConversationHeader } from "./conversation-header";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import type { Message } from "@/types";

interface ConversationViewProps {
  conversationId: string;
}

export function ConversationView({ conversationId }: ConversationViewProps) {
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Flatten pages into a single chronological array
  // Pages are loaded newest-first (cursor-based), so we reverse them
  const allMessages: Message[] = messagesData
    ? [...messagesData.pages].reverse().flatMap((p) => p.data)
    : [];

  // Mark as read on mount
  useEffect(() => {
    api.messages.markRead(conversationId).catch(() => {});
  }, [conversationId]);

  // Auto-scroll to bottom on first load and new messages
  useEffect(() => {
    if (!bottomRef.current) return;
    if (isFirstLoad.current && allMessages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: "instant" });
      isFirstLoad.current = false;
    } else if (!isFirstLoad.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length]);

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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <ConversationHeader conversation={conversation} />

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
          // Show avatar when sender changes or it's the first message
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

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput conversationId={conversationId} />
    </div>
  );
}
