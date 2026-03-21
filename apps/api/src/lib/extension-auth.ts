import { db } from "../db";
import { activityTokens } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashData } from "../middleware/security";
import { validateWsToken } from "./ws-tokens";

/**
 * Resolves the user ID from an "Authorization: Bearer <raw_token>" header.
 * Tokens are generated via POST /api/v1/activity/tokens and stored as SHA-256 hashes.
 * Returns null if the token is missing, invalid, or not found.
 */
export async function resolveExtensionToken(
  headers: Headers
): Promise<string | null> {
  const auth = headers.get("Authorization") ?? headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const raw = auth.slice(7).trim();
  if (!raw) return null;

  return resolveRawToken(raw);
}

/**
 * Resolves the user ID from a raw token string (e.g. from a query param in WS connections).
 * WebSocket connections cannot send custom headers during the upgrade handshake.
 */
export async function resolveRawToken(raw: string): Promise<string | null> {
  if (!raw) return null;

  // Check short-lived WS tokens first (generated for browser/website sessions)
  const wsUserId = validateWsToken(raw);
  if (wsUserId) return wsUserId;

  const hash = await hashData(raw);
  const [token] = await db
    .select({ userId: activityTokens.userId, id: activityTokens.id })
    .from(activityTokens)
    .where(eq(activityTokens.tokenHash, hash))
    .limit(1);

  if (!token) return null;

  // Update last_used_at without blocking the response
  db.update(activityTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(activityTokens.id, token.id))
    .catch(() => {});

  return token.userId;
}
