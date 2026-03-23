import { db, userBlocks, eq } from "../db";

/**
 * Returns a subquery of user IDs that are either blocked by OR that have blocked the given user.
 * Use with notInArray() to filter content from blocked users bidirectionally.
 */
export function blockedUserIds(userId: string) {
  return db
    .select({ id: userBlocks.blockedId })
    .from(userBlocks)
    .where(eq(userBlocks.blockerId, userId))
    .union(
      db
        .select({ id: userBlocks.blockerId })
        .from(userBlocks)
        .where(eq(userBlocks.blockedId, userId)),
    );
}
