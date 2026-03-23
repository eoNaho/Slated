import { Elysia, t } from "elysia";
import {
  db,
  conversations,
  conversationParticipants,
  messages,
  messageReadReceipts,
  dmSettings,
  userBlocks,
  follows,
  user as userTable,
  eq,
  and,
  or,
  desc,
  sql,
  notInArray,
  isNull,
  lt,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { blockedUserIds } from "../lib/block-filter";
import { broadcastToConversation, isOnline } from "../services/ws-manager";
import { encrypt, decrypt } from "../services/crypto";
import { createNotification } from "./notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if either user has blocked the other.
 */
async function isBlocked(userA: string, userB: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, userA), eq(userBlocks.blockedId, userB)),
        and(eq(userBlocks.blockerId, userB), eq(userBlocks.blockedId, userA))
      )
    );
  return !!row;
}

/**
 * Finds an existing 1:1 DM conversation between two users (both must be active participants).
 */
async function findExistingDm(
  userA: string,
  userB: string
): Promise<string | null> {
  const [row] = await db.execute(sql`
    SELECT cp1.conversation_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
    JOIN conversations c
      ON c.id = cp1.conversation_id
    WHERE cp1.user_id = ${userA}
      AND cp2.user_id = ${userB}
      AND c.type = 'dm'
      AND cp1.left_at IS NULL
      AND cp2.left_at IS NULL
    LIMIT 1
  `);
  return (row as any)?.conversation_id ?? null;
}

/**
 * Returns the IDs of all active participants in a conversation (left_at IS NULL).
 */
async function getParticipantIds(conversationId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        isNull(conversationParticipants.leftAt)
      )
    );
  return rows.map((r) => r.userId);
}

/**
 * Checks whether the caller is an active participant in a conversation.
 */
async function isParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
        isNull(conversationParticipants.leftAt)
      )
    );
  return !!row;
}

/**
 * Checks whether the DM privacy settings of `targetUserId` allow `senderId` to message them.
 * Returns true if allowed, false if not.
 */
async function canSendDm(
  senderId: string,
  targetUserId: string
): Promise<boolean> {
  const [settings] = await db
    .select({ allowDmsFrom: dmSettings.allowDmsFrom })
    .from(dmSettings)
    .where(eq(dmSettings.userId, targetUserId));

  const policy = settings?.allowDmsFrom ?? "followers";

  if (policy === "everyone") return true;
  if (policy === "nobody") return false;

  if (policy === "followers") {
    // target must follow sender
    const [row] = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(
        and(eq(follows.followerId, targetUserId), eq(follows.followingId, senderId))
      );
    return !!row;
  }

  if (policy === "following") {
    // sender must follow target
    const [row] = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(
        and(eq(follows.followerId, senderId), eq(follows.followingId, targetUserId))
      );
    return !!row;
  }

  if (policy === "mutual") {
    // both must follow each other
    const rows = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(
        or(
          and(eq(follows.followerId, senderId), eq(follows.followingId, targetUserId)),
          and(eq(follows.followerId, targetUserId), eq(follows.followingId, senderId))
        )
      );
    return rows.length === 2;
  }

  return false;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const messagesRoutes = new Elysia({ prefix: "/messages", tags: ["Messaging"] })
  .use(betterAuthPlugin)

  // ── GET /messages/unread-count ─────────────────────────────────────────────
  .get(
    "/unread-count",
    async (ctx: any) => {
      const { user } = ctx;

      // Count conversations where the user has unread messages
      const [{ total }] = await db.execute(sql`
        SELECT COUNT(DISTINCT cp.conversation_id)::int AS total
        FROM conversation_participants cp
        JOIN messages m ON m.conversation_id = cp.conversation_id
        WHERE cp.user_id = ${user.id}
          AND cp.left_at IS NULL
          AND m.sender_id != ${user.id}
          AND m.is_deleted = FALSE
          AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      `);

      return { count: (total as any) ?? 0 };
    },
    { requireAuth: true }
  )

  // ── GET /messages/settings ─────────────────────────────────────────────────
  .get(
    "/settings",
    async (ctx: any) => {
      const { user } = ctx;
      const [settings] = await db
        .select()
        .from(dmSettings)
        .where(eq(dmSettings.userId, user.id));

      return (
        settings ?? {
          userId: user.id,
          allowDmsFrom: "followers",
          showReadReceipts: true,
          showTypingIndicator: true,
        }
      );
    },
    { requireAuth: true }
  )

  // ── PATCH /messages/settings ───────────────────────────────────────────────
  .patch(
    "/settings",
    async (ctx: any) => {
      const { user, body } = ctx;

      await db
        .insert(dmSettings)
        .values({ userId: user.id, ...body })
        .onConflictDoUpdate({
          target: dmSettings.userId,
          set: { ...body, updatedAt: new Date() },
        });

      const [updated] = await db
        .select()
        .from(dmSettings)
        .where(eq(dmSettings.userId, user.id));

      return updated;
    },
    {
      requireAuth: true,
      body: t.Object({
        allowDmsFrom: t.Optional(
          t.Union([
            t.Literal("everyone"),
            t.Literal("followers"),
            t.Literal("following"),
            t.Literal("mutual"),
            t.Literal("nobody"),
          ])
        ),
        showReadReceipts: t.Optional(t.Boolean()),
        showTypingIndicator: t.Optional(t.Boolean()),
      }),
    }
  )

  // ── GET /messages/conversations ────────────────────────────────────────────
  .get(
    "/conversations",
    async (ctx: any) => {
      const { user, query } = ctx;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const blocked = blockedUserIds(user.id);

      // Conversations where the user is an active participant and has no blocked co-participants
      const rows = await db.execute(sql`
        SELECT
          c.id,
          c.type,
          c.name,
          c.avatar_url AS "avatarUrl",
          c.last_message_at AS "lastMessageAt",
          c.last_message_preview AS "lastMessagePreview",
          c.message_count AS "messageCount",
          c.created_at AS "createdAt",
          -- unread count for this conversation
          (
            SELECT COUNT(*)::int
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id != ${user.id}
              AND m.is_deleted = FALSE
              AND (cp_me.last_read_at IS NULL OR m.created_at > cp_me.last_read_at)
          ) AS "unreadCount",
          -- participants (excluding self, max 5 for display)
          (
            SELECT json_agg(json_build_object(
              'id', u.id,
              'username', u.username,
              'displayName', u."display_name",
              'avatarUrl', u."avatar_url"
            ))
            FROM conversation_participants cp2
            JOIN "user" u ON u.id = cp2.user_id
            WHERE cp2.conversation_id = c.id
              AND cp2.user_id != ${user.id}
              AND cp2.left_at IS NULL
            LIMIT 5
          ) AS "participants"
        FROM conversations c
        JOIN conversation_participants cp_me
          ON cp_me.conversation_id = c.id
         AND cp_me.user_id = ${user.id}
         AND cp_me.left_at IS NULL
        WHERE
          -- exclude conversations that only have blocked users as other participants
          NOT EXISTS (
            SELECT 1
            FROM conversation_participants cp_other
            WHERE cp_other.conversation_id = c.id
              AND cp_other.user_id != ${user.id}
              AND cp_other.left_at IS NULL
              AND cp_other.user_id IN (${blocked})
          )
        ORDER BY c.last_message_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `);

      const [{ total }] = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM conversations c
        JOIN conversation_participants cp_me
          ON cp_me.conversation_id = c.id
         AND cp_me.user_id = ${user.id}
         AND cp_me.left_at IS NULL
      `);

      // Decrypt last message previews
      const data = await Promise.all(
        (rows as any[]).map(async (row) => {
          let preview = null;
          if (row.lastMessagePreview) {
            try {
              preview = await decrypt(row.lastMessagePreview, row.id);
            } catch {
              preview = null;
            }
          }
          return { ...row, lastMessagePreview: preview };
        })
      );

      return {
        data,
        total: Number(total) || 0,
        page,
        limit,
        hasNext: offset + rows.length < (Number(total) || 0),
        hasPrev: page > 1,
      };
    },
    {
      requireAuth: true,
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ── POST /messages/conversations ───────────────────────────────────────────
  .post(
    "/conversations",
    async (ctx: any) => {
      const { user, body, set } = ctx;
      const { type, participantIds, name } = body;

      if (participantIds.includes(user.id)) {
        set.status = 400;
        return { error: "Cannot add yourself as participant" };
      }

      if (type === "dm") {
        if (participantIds.length !== 1) {
          set.status = 400;
          return { error: "DM requires exactly one participant" };
        }

        const otherId = participantIds[0];

        // Check blocks (bidirectional)
        if (await isBlocked(user.id, otherId)) {
          set.status = 403;
          return { error: "Cannot message a blocked user" };
        }

        // Check DM privacy
        const allowed = await canSendDm(user.id, otherId);
        if (!allowed) {
          set.status = 403;
          return { error: "This user does not accept DMs from you" };
        }

        // Find or create 1:1 DM
        const existingId = await findExistingDm(user.id, otherId);
        if (existingId) {
          const [conv] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, existingId));
          return conv;
        }

        // Create new DM conversation
        const [conv] = await db
          .insert(conversations)
          .values({ type: "dm", createdBy: user.id })
          .returning();

        await db.insert(conversationParticipants).values([
          { conversationId: conv.id, userId: user.id, role: "member" },
          { conversationId: conv.id, userId: otherId, role: "member" },
        ]);

        return conv;
      }

      // Group conversation
      if (participantIds.length < 1) {
        set.status = 400;
        return { error: "Group requires at least one other participant" };
      }
      if (participantIds.length > 31) {
        set.status = 400;
        return { error: "Group cannot exceed 32 participants" };
      }

      const [conv] = await db
        .insert(conversations)
        .values({
          type: "group",
          name: name ?? null,
          createdBy: user.id,
        })
        .returning();

      const allParticipants = [user.id, ...participantIds];
      await db.insert(conversationParticipants).values(
        allParticipants.map((uid) => ({
          conversationId: conv.id,
          userId: uid,
          role: uid === user.id ? "admin" : "member",
        }))
      );

      return conv;
    },
    {
      requireAuth: true,
      body: t.Object({
        type: t.Union([t.Literal("dm"), t.Literal("group")]),
        participantIds: t.Array(t.String(), { minItems: 1 }),
        name: t.Optional(t.String({ maxLength: 100 })),
      }),
    }
  )

  // ── GET /messages/conversations/:id ───────────────────────────────────────
  .get(
    "/conversations/:id",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const member = await isParticipant(params.id, user.id);
      if (!member) {
        set.status = 404;
        return { error: "Conversation not found" };
      }

      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, params.id));

      if (!conv) {
        set.status = 404;
        return { error: "Conversation not found" };
      }

      const participants = await db
        .select({
          userId: conversationParticipants.userId,
          role: conversationParticipants.role,
          nickname: conversationParticipants.nickname,
          isMuted: conversationParticipants.isMuted,
          lastReadAt: conversationParticipants.lastReadAt,
          joinedAt: conversationParticipants.joinedAt,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
        })
        .from(conversationParticipants)
        .innerJoin(userTable, eq(conversationParticipants.userId, userTable.id))
        .where(
          and(
            eq(conversationParticipants.conversationId, params.id),
            isNull(conversationParticipants.leftAt)
          )
        );

      return { ...conv, participants };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ── GET /messages/conversations/:id/messages ───────────────────────────────
  .get(
    "/conversations/:id/messages",
    async (ctx: any) => {
      const { user, params, query, set } = ctx;

      const member = await isParticipant(params.id, user.id);
      if (!member) {
        set.status = 404;
        return { error: "Conversation not found" };
      }

      const limit = Math.min(Number(query.limit) || 30, 100);

      let conditions = and(
        eq(messages.conversationId, params.id)
      );

      // Cursor-based pagination (before a specific message createdAt)
      if (query.before) {
        const [cursor] = await db
          .select({ createdAt: messages.createdAt })
          .from(messages)
          .where(eq(messages.id, query.before));
        if (cursor?.createdAt) {
          conditions = and(
            conditions,
            lt(messages.createdAt, cursor.createdAt)
          );
        }
      }

      const rows = await db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          type: messages.type,
          content: messages.content,
          metadata: messages.metadata,
          replyToId: messages.replyToId,
          isEdited: messages.isEdited,
          editedAt: messages.editedAt,
          isDeleted: messages.isDeleted,
          createdAt: messages.createdAt,
          senderUsername: userTable.username,
          senderDisplayName: userTable.displayName,
          senderAvatarUrl: userTable.avatarUrl,
        })
        .from(messages)
        .leftJoin(userTable, eq(messages.senderId, userTable.id))
        .where(conditions)
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      // Decrypt content
      const decrypted = await Promise.all(
        rows.map(async (msg) => {
          if (msg.isDeleted) {
            return { ...msg, content: null };
          }
          try {
            const content = await decrypt(msg.content, params.id);
            return { ...msg, content };
          } catch {
            return { ...msg, content: null };
          }
        })
      );

      return {
        data: decrypted.reverse(), // chronological order
        hasMore: rows.length === limit,
        nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        limit: t.Optional(t.String()),
        before: t.Optional(t.String()),
      }),
    }
  )

  // ── POST /messages/conversations/:id/messages ──────────────────────────────
  .post(
    "/conversations/:id/messages",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      // Single query: get all participant IDs (replaces separate isParticipant + getParticipantIds calls)
      const participantRows = await db
        .select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, params.id),
            isNull(conversationParticipants.leftAt)
          )
        );

      const participantIds = participantRows.map((r) => r.userId);
      if (!participantIds.includes(user.id)) {
        set.status = 404;
        return { error: "Conversation not found" };
      }

      // Encrypt content and preview in parallel
      const preview = body.content.slice(0, 100);
      const [encryptedContent, encryptedPreview] = await Promise.all([
        encrypt(body.content, params.id),
        encrypt(preview, params.id),
      ]);

      const [msg] = await db
        .insert(messages)
        .values({
          conversationId: params.id,
          senderId: user.id,
          type: body.type ?? "text",
          content: encryptedContent,
          metadata: body.metadata ?? null,
          replyToId: body.replyToId ?? null,
        })
        .returning();

      // Broadcast immediately (in-memory, no I/O)
      // Include sender profile fields so receivers don't need an extra fetch
      broadcastToConversation(
        participantIds,
        {
          type: "new_message",
          conversationId: params.id,
          message: {
            ...msg,
            content: body.content,
            senderUsername: user.username ?? null,
            senderDisplayName: user.displayName ?? user.name ?? null,
            senderAvatarUrl: user.image ?? null,
          },
        },
        user.id
      );

      // Fire-and-forget: conversation metadata update + offline notifications
      // These don't need to block the response
      void (async () => {
        const otherParticipants = participantIds.filter((id) => id !== user.id);
        await Promise.all([
          db
            .update(conversations)
            .set({
              lastMessageAt: msg.createdAt,
              lastMessagePreview: encryptedPreview,
              messageCount: sql`${conversations.messageCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, params.id)),
          ...otherParticipants
            .filter((id) => !isOnline(id))
            .map((id) =>
              createNotification(
                id,
                "dm",
                user.displayName ?? user.username,
                preview,
                { conversationId: params.id, messageId: msg.id },
                user.id
              )
            ),
        ]);
      })();

      return { ...msg, content: body.content };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        content: t.String({ minLength: 1, maxLength: 4000 }),
        type: t.Optional(
          t.Union([
            t.Literal("text"),
            t.Literal("story_reply"),
            t.Literal("image"),
          ])
        ),
        metadata: t.Optional(t.Any()),
        replyToId: t.Optional(t.String()),
      }),
    }
  )

  // ── POST /messages/conversations/:id/read ─────────────────────────────────
  .post(
    "/conversations/:id/read",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const member = await isParticipant(params.id, user.id);
      if (!member) {
        set.status = 404;
        return { error: "Conversation not found" };
      }

      await db
        .update(conversationParticipants)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(conversationParticipants.conversationId, params.id),
            eq(conversationParticipants.userId, user.id)
          )
        );

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ── POST /messages/story-reply ─────────────────────────────────────────────
  .post(
    "/story-reply",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      // Get the story and its owner
      const [story] = await db.execute(sql`
        SELECT s.id, s.user_id, s.type, s.content, s.image_url, s.is_expired
        FROM stories s
        WHERE s.id = ${body.storyId}
        LIMIT 1
      `);

      if (!story) {
        set.status = 404;
        return { error: "Story not found" };
      }

      const storyOwner = (story as any).user_id as string;

      if (storyOwner === user.id) {
        set.status = 400;
        return { error: "Cannot reply to your own story" };
      }

      // Check blocks (bidirectional)
      if (await isBlocked(user.id, storyOwner)) {
        set.status = 403;
        return { error: "Cannot message a blocked user" };
      }

      // Check DM privacy settings of the story owner
      const allowed = await canSendDm(user.id, storyOwner);
      if (!allowed) {
        set.status = 403;
        return { error: "This user does not accept DMs from you" };
      }

      // Find or create DM conversation
      let conversationId = await findExistingDm(user.id, storyOwner);

      if (!conversationId) {
        const [conv] = await db
          .insert(conversations)
          .values({ type: "dm", createdBy: user.id })
          .returning();

        await db.insert(conversationParticipants).values([
          { conversationId: conv.id, userId: user.id, role: "member" },
          { conversationId: conv.id, userId: storyOwner, role: "member" },
        ]);

        conversationId = conv.id;
      }

      // Build story metadata snapshot (so it renders even after story expires)
      const metadata = {
        storyId: (story as any).id,
        storyType: (story as any).type,
        storyContent: (story as any).content,
        storyImageUrl: (story as any).image_url,
        storyIsExpired: (story as any).is_expired,
      };

      const storyPreview = body.content.slice(0, 100);
      const [encryptedContent, encryptedPreview] = await Promise.all([
        encrypt(body.content, conversationId),
        encrypt(storyPreview, conversationId),
      ]);

      const [msg] = await db
        .insert(messages)
        .values({
          conversationId,
          senderId: user.id,
          type: "story_reply",
          content: encryptedContent,
          metadata,
        })
        .returning();

      // Broadcast immediately
      broadcastToConversation(
        [user.id, storyOwner],
        {
          type: "new_message",
          conversationId,
          message: {
            ...msg,
            content: body.content,
            senderUsername: user.username ?? null,
            senderDisplayName: user.displayName ?? user.name ?? null,
            senderAvatarUrl: user.image ?? null,
          },
        },
        user.id
      );

      // Fire-and-forget: conversation update + notification
      void Promise.all([
        db
          .update(conversations)
          .set({
            lastMessageAt: msg.createdAt,
            lastMessagePreview: encryptedPreview,
            messageCount: sql`${conversations.messageCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conversationId)),
        isOnline(storyOwner)
          ? Promise.resolve()
          : createNotification(
              storyOwner,
              "story_reply",
              user.displayName ?? user.username,
              storyPreview,
              { conversationId, messageId: msg.id, storyId: body.storyId },
              user.id
            ),
      ]);

      return {
        conversationId,
        message: { ...msg, content: body.content },
      };
    },
    {
      requireAuth: true,
      body: t.Object({
        storyId: t.String(),
        content: t.String({ minLength: 1, maxLength: 1000 }),
      }),
    }
  );
