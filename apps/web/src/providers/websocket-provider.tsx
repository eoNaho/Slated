"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import type { Message } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type TypingHandler = (
  conversationId: string,
  userId: string,
  isTyping: boolean
) => void;

export interface AnnouncementData {
  id: string;
  title: string;
  message: string;
  type: string;
  imageUrl: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
  dismissible: boolean;
}

type AnnouncementHandler = (data: AnnouncementData) => void;

type ServerEvent =
  | { type: "new_message"; conversationId: string; message: Message }
  | {
      type: "typing";
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }
  | { type: "announcement"; data: AnnouncementData }
  | { type: "pong" };

interface WebSocketContextValue {
  /** Send a raw event to the server. No-op when disconnected. */
  send: (event: object) => void;
  /**
   * Subscribe to incoming typing events.
   * Returns an unsubscribe function.
   */
  subscribeTyping: (handler: TypingHandler) => () => void;
  /** Subscribe to incoming announcement push events. Returns unsubscribe fn. */
  subscribeAnnouncement: (handler: AnnouncementHandler) => () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const WebSocketContext = createContext<WebSocketContextValue>({
  send: () => {},
  subscribeTyping: () => () => {},
  subscribeAnnouncement: () => () => {},
});

export function useWsContext(): WebSocketContextValue {
  return useContext(WebSocketContext);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWsUrl(): string {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  return apiUrl.replace(/^http/, "ws").replace(/\/api\/v1$/, "") + "/ws";
}

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Maintains a single WebSocket connection for the authenticated user.
 * Place this at the top of the component tree (e.g., public layout).
 */
export function WebSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  // Connect even when not authenticated — needed to receive public broadcasts (announcements).
  // Authenticated features (messages, typing) still require session.user.
  const enabled = true;
  const isAuthenticated = !!session?.user;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectDelayRef = useRef(1000);
  const isMountedRef = useRef(true);
  const typingHandlersRef = useRef(new Set<TypingHandler>());
  const announcementHandlersRef = useRef(new Set<AnnouncementHandler>());

  const subscribeTyping = useCallback((handler: TypingHandler) => {
    typingHandlersRef.current.add(handler);
    return () => typingHandlersRef.current.delete(handler);
  }, []);

  const subscribeAnnouncement = useCallback((handler: AnnouncementHandler) => {
    announcementHandlersRef.current.add(handler);
    return () => announcementHandlersRef.current.delete(handler);
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelayRef.current = 1000; // reset backoff
    };

    ws.onmessage = (event) => {
      let data: ServerEvent;
      try {
        data = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (data.type === "new_message") {
        const { conversationId, message } = data;

        // Append to messages cache (infinite query) — no refetch needed
        queryClient.setQueryData(
          ["messages", conversationId],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (old: any) => {
            if (!old) return old;
            const pages = [...old.pages];
            if (pages.length > 0) {
              const lastPage = pages[pages.length - 1];
              const alreadyExists = lastPage.data.some(
                (m: Message) => m.id === message.id
              );
              if (!alreadyExists) {
                pages[pages.length - 1] = {
                  ...lastPage,
                  data: [...lastPage.data, message],
                };
              }
            }
            return { ...old, pages };
          }
        );

        // Update conversation list cache directly — avoids a full refetch of the
        // heavy conversations query (subqueries + decrypt all previews)
        queryClient.setQueryData(
          ["conversations"],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (old: any) => {
            if (!old?.data) return old;
            const now = message.createdAt ?? new Date().toISOString();
            const updatedConvs = old.data.map((conv: { id: string }) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    lastMessageAt: now,
                    lastMessagePreview: message.content ?? "",
                    // Bump unread count if the message is from someone else.
                    // The actual sender side already used optimistic update so their
                    // unreadCount stays at 0; the receiver increments here.
                    unreadCount: (conv as { unreadCount?: number }).unreadCount
                      ? (conv as { unreadCount: number }).unreadCount + 1
                      : 1,
                  }
                : conv
            );
            // Re-sort by lastMessageAt descending
            updatedConvs.sort(
              (a: { lastMessageAt: string | null }, b: { lastMessageAt: string | null }) =>
                (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "")
            );
            return { ...old, data: updatedConvs };
          }
        );

        // Still invalidate unread count badge (cheap single-number query)
        queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
      }

      if (data.type === "typing") {
        typingHandlersRef.current.forEach((h) =>
          h(data.conversationId, data.userId, data.isTyping)
        );
      }

      if (data.type === "announcement") {
        announcementHandlersRef.current.forEach((h) => h(data.data));
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      if (!isMountedRef.current || !enabled) return;

      const delay = Math.min(reconnectDelayRef.current, 30000);
      reconnectDelayRef.current = delay * 2;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled, queryClient]);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);

  const send = useCallback((event: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ send, subscribeTyping, subscribeAnnouncement }}>
      {children}
    </WebSocketContext.Provider>
  );
}
