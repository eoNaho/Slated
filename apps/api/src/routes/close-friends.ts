import { Elysia, t } from "elysia";
import {
  db,
  closeFriends,
  user as userTable,
  follows,
  eq,
  and,
  desc,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const closeFriendsRoutes = new Elysia({ prefix: "/close-friends", tags: ["Social"] })
  .use(betterAuthPlugin)

  // List own close friends
  .get(
    "/",
    async (ctx: any) => {
      const { user } = ctx;

      const friends = await db
        .select({
          id: userTable.id,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
          addedAt: closeFriends.createdAt,
        })
        .from(closeFriends)
        .innerJoin(userTable, eq(closeFriends.friendId, userTable.id))
        .where(eq(closeFriends.userId, user.id))
        .orderBy(desc(closeFriends.createdAt));

      return { data: friends };
    },
    { requireAuth: true }
  )

  // Add close friend
  .post(
    "/",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      if (body.friend_id === user.id) {
        set.status = 400;
        return { error: "Cannot add yourself as close friend" };
      }

      // Target user must exist
      const [targetUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, body.friend_id))
        .limit(1);

      if (!targetUser) {
        set.status = 404;
        return { error: "User not found" };
      }

      // Must be following the user
      const [followRow] = await db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(and(eq(follows.followerId, user.id), eq(follows.followingId, body.friend_id)))
        .limit(1);

      if (!followRow) {
        set.status = 400;
        return { error: "You must follow a user to add them as a close friend" };
      }

      await db
        .insert(closeFriends)
        .values({ userId: user.id, friendId: body.friend_id })
        .onConflictDoNothing();

      return { success: true };
    },
    {
      requireAuth: true,
      body: t.Object({ friend_id: t.String() }),
    }
  )

  // Remove close friend
  .delete(
    "/:friendId",
    async (ctx: any) => {
      const { user, params } = ctx;

      await db
        .delete(closeFriends)
        .where(
          and(
            eq(closeFriends.userId, user.id),
            eq(closeFriends.friendId, params.friendId),
          )
        );

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ friendId: t.String() }),
    }
  )

  // Check close friend status
  .get(
    "/status/:userId",
    async (ctx: any) => {
      const { user, params } = ctx;

      const [row] = await db
        .select({ userId: closeFriends.userId })
        .from(closeFriends)
        .where(
          and(
            eq(closeFriends.userId, user.id),
            eq(closeFriends.friendId, params.userId),
          )
        )
        .limit(1);

      return { isCloseFriend: !!row };
    },
    {
      requireAuth: true,
      params: t.Object({ userId: t.String() }),
    }
  );
