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

type ServerEvent =
  | { type: "new_message"; conversationId: string; message: Message }
  | {
      type: "typing";
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }
  | { type: "pong" };

interface WebSocketContextValue {
  /** Send a raw event to the server. No-op when disconnected. */
  send: (event: object) => void;
  /**
   * Subscribe to incoming typing events.
   * Returns an unsubscribe function.
   */
  subscribeTyping: (handler: TypingHandler) => () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const WebSocketContext = createContext<WebSocketContextValue>({
  send: () => {},
  subscribeTyping: () => () => {},
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
  const enabled = !!session?.user;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectDelayRef = useRef(1000);
  const isMountedRef = useRef(true);
  const typingHandlersRef = useRef(new Set<TypingHandler>());

  const subscribeTyping = useCallback((handler: TypingHandler) => {
    typingHandlersRef.current.add(handler);
    return () => typingHandlersRef.current.delete(handler);
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

        // Append to messages cache (infinite query)
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

        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
      }

      if (data.type === "typing") {
        typingHandlersRef.current.forEach((h) =>
          h(data.conversationId, data.userId, data.isTyping)
        );
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      if (event.code === 4001 || !isMountedRef.current || !enabled) return;

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
    <WebSocketContext.Provider value={{ send, subscribeTyping }}>
      {children}
    </WebSocketContext.Provider>
  );
}
