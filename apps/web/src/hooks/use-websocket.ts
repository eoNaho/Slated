/**
 * Re-exports from the global WebSocketProvider context.
 * The actual WebSocket connection lives in WebSocketProvider (public layout).
 */
export { useWsContext as useWebSocket } from "@/providers/websocket-provider";
