import { Elysia, t } from "elysia";
import {
  db,
  comments,
  user as userTable,
  reviews,
  lists,
  likes,
  eq,
  and,
  desc,
  count,
  sql,
  isNull,
  inArray,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const commentsRoutes = new Elysia({ prefix: "/comments", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get comments for a target (review or list)
  .get(
    "/",
    async ({ query }) => {
      const targetType = query.target_type as "review" | "list";
      const targetId = query.target_id;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const results = await db
        .select({
          comment: comments,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(comments)
        .innerJoin(userTable, eq(comments.userId, userTable.id))
        .where(
          and(
            eq(comments.targetType, targetType),
            eq(comments.targetId, targetId),
            isNull(comments.parentId) // Top-level only
          )
        )
        .orderBy(desc(comments.createdAt))
        .limit(limit)
        .offset(offset);

      // Batch-fetch reply counts for all comments in one query
      const commentIds = results.map((r) => r.comment.id);
      const replyCountRows = commentIds.length > 0
        ? await db
            .select({ parentId: comments.parentId, repliesCount: count() })
            .from(comments)
            .where(inArray(comments.parentId, commentIds))
            .groupBy(comments.parentId)
        : [];

      const replyCountMap = new Map(replyCountRows.map((r) => [r.parentId, Number(r.repliesCount)]));

      const commentsWithReplies = results.map((r) => ({
        ...r.comment,
        user: r.user,
        repliesCount: replyCountMap.get(r.comment.id) ?? 0,
      }));

      const [{ total }] = await db
        .select({ total: count() })
        .from(comments)
        .where(
          and(
            eq(comments.targetType, targetType),
            eq(comments.targetId, targetId),
            isNull(comments.parentId)
          )
        );

      return {
        data: commentsWithReplies,
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      query: t.Object({
        target_type: t.Union([t.Literal("review"), t.Literal("list")]),
        target_id: t.String(),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // Get replies to a comment
  .get(
    "/:id/replies",
    async ({ params, query }) => {
      const limit = Math.min(Number(query.limit) || 10, 50);

      const replies = await db
        .select({
          comment: comments,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(comments)
        .innerJoin(userTable, eq(comments.userId, userTable.id))
        .where(eq(comments.parentId, params.id))
        .orderBy(comments.createdAt)
        .limit(limit);

      return {
        data: replies.map((r) => ({ ...r.comment, user: r.user })),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ limit: t.Optional(t.String()) }),
    }
  )

  // Create comment
  .post(
    "/",
    async (ctx: any) => {
      const { user: authUser, body } = ctx;

      const [newComment] = await db
        .insert(comments)
        .values({
          userId: authUser.id,
          targetType: body.target_type,
          targetId: body.target_id,
          parentId: body.parent_id || null,
          content: body.content,
        })
        .returning();

      // Update comment count on target
      if (body.target_type === "review") {
        await db
          .update(reviews)
          .set({ commentsCount: sql`${reviews.commentsCount} + 1` })
          .where(eq(reviews.id, body.target_id));
      }

      return { data: newComment };
    },
    {
      requireAuth: true,
      body: t.Object({
        target_type: t.Union([t.Literal("review"), t.Literal("list")]),
        target_id: t.String(),
        parent_id: t.Optional(t.String()),
        content: t.String({ minLength: 1, maxLength: 2000 }),
      }),
    }
  )

  // Delete comment
  .delete(
    "/:id",
    async (ctx: any) => {
      const { user: authUser, params, set } = ctx;

      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, params.id));

      if (!comment) {
        set.status = 404;
        return { error: "Comment not found" };
      }

      if (comment.userId !== authUser.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      await db.delete(comments).where(eq(comments.id, params.id));

      // Decrement count
      if (comment.targetType === "review") {
        await db
          .update(reviews)
          .set({ commentsCount: sql`${reviews.commentsCount} - 1` })
          .where(eq(reviews.id, comment.targetId));
      }

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // Like comment
  .post(
    "/:id/like",
    async (ctx: any) => {
      const { user: authUser, params, set } = ctx;

      try {
        await db.insert(likes).values({
          userId: authUser.id,
          targetType: "comment",
          targetId: params.id,
        });

        await db
          .update(comments)
          .set({ likesCount: sql`${comments.likesCount} + 1` })
          .where(eq(comments.id, params.id));

        return { success: true };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already liked" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  );
