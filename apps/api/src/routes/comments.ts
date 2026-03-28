import { Elysia } from "elysia";
import {
  db,
  comments,
  user as userTable,
  reviews,
  lists,
  likes,
  contentFlags,
  eq,
  and,
  desc,
  count,
  sql,
  isNull,
  inArray,
  notInArray,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { blockedUserIds } from "../lib/block-filter";
import { contentFilterService } from "../services/content-filter";
import { checkContentVelocity } from "../lib/moderation-escalation";
import { createNotification } from "./notifications";
import {
  ListCommentsQuery,
  ListRepliesQuery,
  CreateCommentBody,
  IdParam,
} from "@pixelreel/validators";
import { ok, paginated } from "../utils/response";

export const commentsRoutes = new Elysia({ prefix: "/comments", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get comments for a target (review or list)
  .get(
    "/",
    async ({ query, ...ctx }) => {
      const authUser = (ctx as any).user ?? null;
      const targetType = query.target_type as "review" | "list";
      const targetId = query.target_id;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const conditions: ReturnType<typeof eq>[] = [
        eq(comments.targetType, targetType),
        eq(comments.targetId, targetId),
        isNull(comments.parentId),
        eq(comments.isHidden, false),
      ];
      if (authUser) conditions.push(notInArray(comments.userId, blockedUserIds(authUser.id)) as any);

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
        .where(and(...conditions))
        .orderBy(desc(comments.createdAt))
        .limit(limit)
        .offset(offset);

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
        .where(and(...conditions));

      return paginated(commentsWithReplies, total, page, limit);
    },
    { query: ListCommentsQuery },
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

      return ok(replies.map((r) => ({ ...r.comment, user: r.user })));
    },
    {
      params: IdParam,
      query: ListRepliesQuery,
    },
  )

  // Create comment
  .post(
    "/",
    async ({ body, ...ctx }) => {
      const authUser = (ctx as any).user;

      const [filterResult] = await Promise.all([
        contentFilterService.check(body.content),
        checkContentVelocity(authUser.id, "comment"),
      ]);

      const [newComment] = await db
        .insert(comments)
        .values({
          userId: authUser.id,
          targetType: body.target_type,
          targetId: body.target_id,
          parentId: body.parent_id || null,
          content: body.content,
          isHidden: filterResult.shouldAutoHide,
          hiddenReason: filterResult.shouldAutoHide ? "Automated: content policy violation" : null,
          hiddenAt: filterResult.shouldAutoHide ? new Date() : null,
        })
        .returning();

      if (filterResult.flagged) {
        await db.insert(contentFlags).values({
          targetType: "comment",
          targetId: newComment.id,
          flagType: filterResult.matches[0]?.type ?? "profanity",
          severity: filterResult.severity === "none" ? "low" : filterResult.severity,
          details: JSON.stringify(filterResult.matches),
          autoActioned: filterResult.shouldAutoHide,
        });
      }

      if (body.target_type === "review") {
        await db
          .update(reviews)
          .set({ commentsCount: sql`${reviews.commentsCount} + 1` })
          .where(eq(reviews.id, body.target_id));
      }

      if (!filterResult.shouldAutoHide) {
        const [commenter] = await db.select({ displayName: userTable.displayName, username: userTable.username }).from(userTable).where(eq(userTable.id, authUser.id)).limit(1);
        const name = commenter?.displayName || commenter?.username || "Someone";

        if (body.target_type === "review") {
          const [review] = await db.select({ userId: reviews.userId }).from(reviews).where(eq(reviews.id, body.target_id)).limit(1);
          if (review && review.userId !== authUser.id) {
            const url = `/reviews/${body.target_id}`;
            const notifTitle = body.parent_id ? `${name} replied to a comment` : `${name} commented on your review`;
            createNotification(review.userId, "comment", notifTitle, body.content.slice(0, 100), { url, targetType: "review", targetId: body.target_id, commentId: newComment.id }, authUser.id).catch(() => null);
          }
        } else if (body.target_type === "list") {
          const [list] = await db.select({ userId: lists.userId }).from(lists).where(eq(lists.id, body.target_id)).limit(1);
          if (list && list.userId !== authUser.id) {
            const url = `/lists/${body.target_id}`;
            createNotification(list.userId, "comment", `${name} commented on your list`, body.content.slice(0, 100), { url, targetType: "list", targetId: body.target_id, commentId: newComment.id }, authUser.id).catch(() => null);
          }
        }

        if (body.parent_id) {
          const [parentComment] = await db.select({ userId: comments.userId }).from(comments).where(eq(comments.id, body.parent_id)).limit(1);
          if (parentComment && parentComment.userId !== authUser.id) {
            const url = body.target_type === "review" ? `/reviews/${body.target_id}` : `/lists/${body.target_id}`;
            createNotification(parentComment.userId, "comment", `${name} replied to your comment`, body.content.slice(0, 100), { url, targetType: body.target_type, targetId: body.target_id, commentId: newComment.id }, authUser.id).catch(() => null);
          }
        }
      }

      return ok(newComment);
    },
    {
      requireAuth: true,
      body: CreateCommentBody,
    },
  )

  // Delete comment
  .delete(
    "/:id",
    async ({ params, set, ...ctx }) => {
      const authUser = (ctx as any).user;

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
      params: IdParam,
    },
  )

  // Like comment
  .post(
    "/:id/like",
    async ({ params, set, ...ctx }) => {
      const authUser = (ctx as any).user;

      try {
        await db.insert(likes).values({
          userId: authUser.id,
          targetType: "comment",
          targetId: params.id,
        });

        const [updated] = await db
          .update(comments)
          .set({ likesCount: sql`${comments.likesCount} + 1` })
          .where(eq(comments.id, params.id))
          .returning({ userId: comments.userId, targetType: comments.targetType, targetId: comments.targetId });

        if (updated && updated.userId !== authUser.id) {
          const [liker] = await db.select({ displayName: userTable.displayName, username: userTable.username }).from(userTable).where(eq(userTable.id, authUser.id)).limit(1);
          const name = liker?.displayName || liker?.username || "Someone";
          const url = updated.targetType === "review" ? `/reviews/${updated.targetId}` : `/lists/${updated.targetId}`;
          createNotification(updated.userId, "like", `${name} liked your comment`, "", { url, commentId: params.id }, authUser.id).catch(() => null);
        }

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
      params: IdParam,
    },
  );
