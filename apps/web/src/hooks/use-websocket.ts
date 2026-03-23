"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Message } from "@/types";

// Derive WS URL from the API base URL (http→ws, https→wss)
function getWsUrl(): string {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  return apiUrl.replace(/^http/, "ws").replace(/\/api\/v1$/, "") + "/ws";
}

type ServerEvent =
  | { type: "new_message"; conversationId: string; message: Message }
  | { type: "typing"; conversationId: string; userId: string; isTyping: boolean }
  | { type: "pong" };

interface UseWebSocketOptions {
  /** Called when a typing event arrives for any conversation. */
  onTyping?: (conversationId: string, userId: string, isTyping: boolean) => void;
  enabled?: boolean;
}

/**
 * Maintains a single persistent WebSocket connection for the authenticated user.
 *
 * - Reconnects with exponential backoff (1s → 2s → 4s … 30s max)
 * - Appends new_message events directly into TanStack Query cache (no refetch needed)
 * - Forwards typing events to the optional onTyping callback
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onTyping, enabled = true } = options;
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelayRef.current = 1000; // reset backoff on success
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
              // Avoid duplicates (in case REST + WS race)
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

        // Refresh the inbox list order/preview
        queryClient.invalidateQueries({ queryKey: ["conversations"] });

        // Update unread badge count
        queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
      }

      if (data.type === "typing") {
        onTyping?.(data.conversationId, data.userId, data.isTyping);
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      // 4001 = unauthorized — don't reconnect
      if (event.code === 4001 || !isMountedRef.current || !enabled) return;

      // Exponential backoff: 1s → 2s → 4s … 30s
      const delay = Math.min(reconnectDelayRef.current, 30000);
      reconnectDelayRef.current = delay * 2;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled, queryClient, onTyping]);

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

  /** Send a raw event to the server. */
  const send = useCallback((event: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { send };
}
