/**
 * Short-lived tokens for WebSocket authentication from browser sessions.
 * The website fetches one via GET /api/v1/watch-party/ws-token (session-authenticated),
 * then uses it as ?token= in the WS URL.
 *
 * - TTL: 2 minutes (enough for page load + WS connect + reconnects)
 * - Not consumed on use — valid for the full TTL to allow reconnects
 * - Stored in-memory only; cleared on server restart (acceptable)
 */

interface WsTokenEntry {
  userId: string;
  expiresAt: number;
}

const store = new Map<string, WsTokenEntry>();

// Cleanup expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of store) {
    if (entry.expiresAt < now) store.delete(token);
  }
}, 60_000);

export function generateWsToken(userId: string): string {
  const token = crypto.randomUUID();
  store.set(token, { userId, expiresAt: Date.now() + 2 * 60_000 });
  return token;
}

/** Returns userId if the token is valid, null otherwise. Does NOT consume the token. */
export function validateWsToken(token: string): string | null {
  const entry = store.get(token);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.userId;
}
