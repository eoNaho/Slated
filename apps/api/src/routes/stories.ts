import { Elysia, t } from "elysia";
import {
  db,
  stories,
  storyViews,
  storyReactions,
  storyPollVotes,
  storyHighlights,
  storyHighlightItems,
  storyQuizAnswers,
  storyQuestionResponses,
  closeFriends,
  follows,
  user as userTable,
  eq,
  and,
  or,
  desc,
  count,
  sql,
  inArray,
  isNotNull,
  asc,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { storageService } from "../services/storage";
import { logger } from "../utils/logger";
import { handleStoryCreated, handleStoryReactionMilestone } from "../services/gamification";
import { createNotification } from "./notifications";

// ── Content validation helpers ────────────────────────────────────────────────

function validateStoryContent(type: string, content: any): { valid: boolean; error?: string } {
  switch (type) {
    case "watch":
      if (!content.media_id || !content.media_title) {
        return { valid: false, error: "watch story requires media_id and media_title" };
      }
      if (content.note && content.note.length > 140) {
        return { valid: false, error: "watch note must be at most 140 characters" };
      }
      return { valid: true };

    case "list":
      if (!content.list_id || !content.list_name) {
        return { valid: false, error: "list story requires list_id and list_name" };
      }
      return { valid: true };

    case "rating":
      if (!content.media_id || !content.media_title || content.rating == null) {
        return { valid: false, error: "rating story requires media_id, media_title, and rating" };
      }
      if (content.rating < 0.5 || content.rating > 5) {
        return { valid: false, error: "rating must be between 0.5 and 5" };
      }
      if (content.text && content.text.length > 200) {
        return { valid: false, error: "rating text must be at most 200 characters" };
      }
      return { valid: true };

    case "poll":
      if (!content.options || !Array.isArray(content.options) || content.options.length < 2 || content.options.length > 4) {
        return { valid: false, error: "poll story requires 2-4 options" };
      }
      for (const opt of content.options) {
        if (!opt.text || typeof opt.text !== "string") {
          return { valid: false, error: "each poll option must have a text string" };
        }
      }
      return { valid: true };

    case "hot_take":
      if (!content.statement || typeof content.statement !== "string") {
        return { valid: false, error: "hot_take story requires a statement" };
      }
      if (content.statement.length > 280) {
        return { valid: false, error: "hot_take statement must be at most 280 characters" };
      }
      return { valid: true };

    case "rewind":
      if (!content.date || !content.media_watched || !Array.isArray(content.media_watched)) {
        return { valid: false, error: "rewind story requires date and media_watched array" };
      }
      return { valid: true };

    case "countdown":
      if (!content.media_id || !content.media_title || !content.release_date) {
        return { valid: false, error: "countdown story requires media_id, media_title, and release_date" };
      }
      return { valid: true };

    case "quiz":
      if (!content.question || !Array.isArray(content.options) || content.options.length < 2 || content.options.length > 4) {
        return { valid: false, error: "quiz story requires a question and 2-4 options" };
      }
      if (content.correct_index == null || content.correct_index < 0 || content.correct_index >= content.options.length) {
        return { valid: false, error: "quiz story requires a valid correct_index" };
      }
      return { valid: true };

    case "question_box":
      if (!content.question || typeof content.question !== "string") {
        return { valid: false, error: "question_box story requires a question" };
      }
      if (content.question.length > 200) {
        return { valid: false, error: "question must be at most 200 characters" };
      }
      return { valid: true };

    default:
      return { valid: false, error: `unknown story type: ${type}` };
  }
}

// ── Route definitions ─────────────────────────────────────────────────────────

export const storiesRoutes = new Elysia({ prefix: "/stories", tags: ["Social"] })
  .use(betterAuthPlugin)

  // ── Create story ──────────────────────────────────────────────────────────
  .post(
    "/",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      // Validate content per type
      const validation = validateStoryContent(body.type, body.content);
      if (!validation.valid) {
        set.status = 400;
        return { error: validation.error };
      }

      const expiresAt = body.expires_at
        ? new Date(body.expires_at)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // default 24h

      // Validate slides if provided
      if (body.slides && Array.isArray(body.slides)) {
        for (let i = 0; i < body.slides.length; i++) {
          const slide = body.slides[i] as any;
          const sv = validateStoryContent(slide.type, slide.content);
          if (!sv.valid) {
            set.status = 400;
            return { error: `Slide ${i + 1}: ${sv.error}` };
          }
        }
      }

      // Send mention notifications (fire-and-forget)
      const mentions = (body.content as any)?.mentions;
      if (Array.isArray(mentions)) {
        for (const m of mentions) {
          if (m.user_id && m.user_id !== user.id) {
            createNotification(
              m.user_id,
              "story_mention",
              `${user.username} te marcou em uma story`,
              "",
              { storyType: body.type },
            ).catch(() => null);
          }
        }
      }

      const [newStory] = await db
        .insert(stories)
        .values({
          userId: user.id,
          type: body.type,
          content: body.content,
          expiresAt: expiresAt,
          visibility: body.visibility ?? "public",
          slides: body.slides ?? null,
        })
        .returning();

      // Grant +5 XP for creating a story (fire-and-forget)
      handleStoryCreated(user.id).catch(() => null);

      return { data: newStory };
    },
    {
      requireAuth: true,
      body: t.Object({
        type: t.String(),
        content: t.Any(),
        expires_at: t.Optional(t.String()),
        visibility: t.Optional(t.String()), // 'public' | 'followers' | 'close_friends'
        slides: t.Optional(t.Any()),        // StorySlide[] for multi-slide
      }),
    }
  )

  // ── Feed — stories from followed users ────────────────────────────────────
  .get(
    "/feed",
    async (ctx: any) => {
      const { user, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      // Get followed user IDs
      const followedUsers = await db
        .select({ id: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, user.id));

      const followedIds = followedUsers.map((f) => f.id);

      // Include own stories in the feed
      followedIds.push(user.id);

      if (followedIds.length === 0) {
        return { data: [], total: 0, page, limit, hasNext: false, hasPrev: false };
      }

      // Users who have added current user as close friend
      const closeFriendOfRows = await db
        .select({ userId: closeFriends.userId })
        .from(closeFriends)
        .where(eq(closeFriends.friendId, user.id));
      const closeFriendOfIds = closeFriendOfRows.map((r) => r.userId);

      // Visibility filter
      const visibilityFilter = or(
        eq(stories.userId, user.id), // always see own stories
        and(
          inArray(stories.userId, followedIds),
          eq(stories.visibility, "public"),
        ),
        and(
          inArray(stories.userId, followedIds),
          eq(stories.visibility, "followers"),
        ),
        ...(closeFriendOfIds.length > 0
          ? [and(
              inArray(stories.userId, closeFriendOfIds),
              eq(stories.visibility, "close_friends"),
            )]
          : []),
      );

      const results = await db
        .select({
          story: stories,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(stories)
        .innerJoin(userTable, eq(stories.userId, userTable.id))
        .where(
          and(
            eq(stories.isExpired, false),
            visibilityFilter,
          )
        )
        .orderBy(desc(stories.createdAt))
        .limit(limit)
        .offset(offset);

      // Check which stories the user has already viewed
      const storyIds = results.map((r) => r.story.id);
      let viewedStoryIds = new Set<string>();
      if (storyIds.length > 0) {
        const viewed = await db
          .select({ storyId: storyViews.storyId })
          .from(storyViews)
          .where(
            and(
              inArray(storyViews.storyId, storyIds),
              eq(storyViews.viewerId, user.id),
            )
          );
        viewedStoryIds = new Set(viewed.map((v) => v.storyId));
      }

      return {
        data: results.map((r) => ({
          ...r.story,
          user: r.user,
          hasViewed: viewedStoryIds.has(r.story.id),
        })),
        page,
        limit,
        hasNext: results.length === limit,
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

  // ── Stories by username ───────────────────────────────────────────────────
  .get(
    "/user/:username",
    async ({ params, query, request }) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      // Find user by username
      const [targetUser] = await db
        .select({ id: userTable.id, username: userTable.username, displayName: userTable.displayName, avatarUrl: userTable.avatarUrl })
        .from(userTable)
        .where(eq(userTable.username, params.username))
        .limit(1);

      if (!targetUser) {
        return { error: "User not found", data: [] };
      }

      // Determine viewer relationship for visibility filtering
      const session = await getOptionalSession(request.headers);
      const viewerId = session?.user?.id;
      const isOwner = viewerId === targetUser.id;

      let visibilityFilter;
      if (isOwner) {
        visibilityFilter = sql`true`; // owner sees all their stories
      } else if (viewerId) {
        // Check if viewer follows target
        const [followRow] = await db
          .select({ followerId: follows.followerId })
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, targetUser.id)))
          .limit(1);
        const isFollower = !!followRow;

        // Check if viewer is in target's close friends list
        const [cfRow] = await db
          .select({ userId: closeFriends.userId })
          .from(closeFriends)
          .where(and(eq(closeFriends.userId, targetUser.id), eq(closeFriends.friendId, viewerId)))
          .limit(1);
        const isCloseFriend = !!cfRow;

        if (isCloseFriend) {
          visibilityFilter = inArray(stories.visibility, ["public", "followers", "close_friends"]);
        } else if (isFollower) {
          visibilityFilter = inArray(stories.visibility, ["public", "followers"]);
        } else {
          visibilityFilter = eq(stories.visibility, "public");
        }
      } else {
        visibilityFilter = eq(stories.visibility, "public");
      }

      // Get active + pinned stories
      const results = await db
        .select()
        .from(stories)
        .where(
          and(
            eq(stories.userId, targetUser.id),
            sql`(${stories.isExpired} = false OR ${stories.isPinned} = true)`,
            visibilityFilter,
          )
        )
        .orderBy(desc(stories.isPinned), desc(stories.createdAt))
        .limit(limit)
        .offset(offset);

      // Check viewed status if authenticated
      let viewedStoryIds = new Set<string>();
      if (viewerId) {
        const storyIds = results.map((r) => r.id);
        if (storyIds.length > 0) {
          const viewed = await db
            .select({ storyId: storyViews.storyId })
            .from(storyViews)
            .where(
              and(
                inArray(storyViews.storyId, storyIds),
                eq(storyViews.viewerId, viewerId),
              )
            );
          viewedStoryIds = new Set(viewed.map((v) => v.storyId));
        }
      }

      return {
        data: results.map((r) => ({
          ...r,
          user: targetUser,
          hasViewed: viewedStoryIds.has(r.id),
        })),
        page,
        limit,
        hasNext: results.length === limit,
        hasPrev: page > 1,
      };
    },
    {
      params: t.Object({ username: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ── Get single story ─────────────────────────────────────────────────────
  .get(
    "/:id",
    async ({ params, request, set }) => {
      const [result] = await db
        .select({
          story: stories,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(stories)
        .innerJoin(userTable, eq(stories.userId, userTable.id))
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!result) {
        set.status = 404;
        return { error: "Story not found" };
      }

      // Get reactions summary
      const reactionsData = await db
        .select({
          reaction: storyReactions.reaction,
          count: count(),
        })
        .from(storyReactions)
        .where(eq(storyReactions.storyId, params.id))
        .groupBy(storyReactions.reaction);

      // Get poll results if poll type
      let pollResults: { optionIndex: number; count: number }[] = [];
      if (result.story.type === "poll") {
        pollResults = await db
          .select({
            optionIndex: storyPollVotes.optionIndex,
            count: count(),
          })
          .from(storyPollVotes)
          .where(eq(storyPollVotes.storyId, params.id))
          .groupBy(storyPollVotes.optionIndex);
      }

      // Check if current user has reacted/voted
      let userReaction: string | null = null;
      let userPollVote: number | null = null;
      const session = await getOptionalSession(request.headers);
      if (session?.user) {
        const [reaction] = await db
          .select({ reaction: storyReactions.reaction })
          .from(storyReactions)
          .where(
            and(
              eq(storyReactions.storyId, params.id),
              eq(storyReactions.userId, session.user.id),
            )
          )
          .limit(1);
        userReaction = reaction?.reaction ?? null;

        if (result.story.type === "poll") {
          const [vote] = await db
            .select({ optionIndex: storyPollVotes.optionIndex })
            .from(storyPollVotes)
            .where(
              and(
                eq(storyPollVotes.storyId, params.id),
                eq(storyPollVotes.userId, session.user.id),
              )
            )
            .limit(1);
          userPollVote = vote?.optionIndex ?? null;
        }
      }

      return {
        data: {
          ...result.story,
          user: result.user,
          reactions: reactionsData.map((r) => ({ reaction: r.reaction, count: r.count })),
          pollResults: pollResults.length > 0
            ? pollResults.map((p) => ({ optionIndex: p.optionIndex, count: p.count }))
            : undefined,
          userReaction,
          userPollVote,
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // ── Delete story ──────────────────────────────────────────────────────────
  .delete(
    "/:id",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [existing] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Story not found" };
      }

      if (existing.userId !== user.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      // Clean up image from storage if exists
      if (existing.imageUrl) {
        await storageService.delete(existing.imageUrl).catch(() => {});
      }

      await db.delete(stories).where(eq(stories.id, params.id));

      set.status = 204;
      return null;
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ── Register view ─────────────────────────────────────────────────────────
  .post(
    "/:id/view",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      await db
        .insert(storyViews)
        .values({
          storyId: params.id,
          viewerId: user.id,
        })
        .onConflictDoNothing();

      // views_count is auto-incremented by trigger
      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ── React to story ────────────────────────────────────────────────────────
  .post(
    "/:id/react",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      // Verify story exists
      const [story] = await db
        .select({ id: stories.id })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!story) {
        set.status = 404;
        return { error: "Story not found" };
      }

      try {
        // Upsert: update reaction if already exists
        const [reaction] = await db
          .insert(storyReactions)
          .values({
            storyId: params.id,
            userId: user.id,
            reaction: body.reaction,
            textReply: body.text_reply,
          })
          .onConflictDoUpdate({
            target: [storyReactions.storyId, storyReactions.userId],
            set: {
              reaction: body.reaction,
              textReply: body.text_reply,
            },
          })
          .returning();

        // Check reaction milestone for XP (fire-and-forget)
        const [{ total }] = await db
          .select({ total: count() })
          .from(storyReactions)
          .where(eq(storyReactions.storyId, params.id));

        const [storyOwner] = await db
          .select({ userId: stories.userId })
          .from(stories)
          .where(eq(stories.id, params.id))
          .limit(1);

        if (storyOwner && Number(total) >= 10) {
          handleStoryReactionMilestone(storyOwner.userId, Number(total)).catch(() => null);
        }

        // Send reply notification to story owner (fire-and-forget)
        if (body.text_reply && storyOwner && storyOwner.userId !== user.id) {
          createNotification(
            storyOwner.userId,
            "story_reply",
            `${user.username} respondeu sua story`,
            body.text_reply.slice(0, 100),
            { storyId: params.id, senderId: user.id },
          ).catch(() => null);
        }

        return { data: reaction };
      } catch (e: any) {
        throw e;
      }
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        reaction: t.String(), // 'agree' | 'disagree' | emoji
        text_reply: t.Optional(t.String({ maxLength: 500 })),
      }),
    }
  )

  // ── Remove reaction ───────────────────────────────────────────────────────
  .delete(
    "/:id/react",
    async (ctx: any) => {
      const { user, params } = ctx;

      await db
        .delete(storyReactions)
        .where(
          and(
            eq(storyReactions.storyId, params.id),
            eq(storyReactions.userId, user.id),
          )
        );

      // reactions_count is auto-decremented by trigger
      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ── Vote on poll ──────────────────────────────────────────────────────────
  .post(
    "/:id/poll-vote",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      // Verify story exists and is a poll
      const [story] = await db
        .select({ id: stories.id, type: stories.type, content: stories.content, isExpired: stories.isExpired })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!story) {
        set.status = 404;
        return { error: "Story not found" };
      }

      if (story.type !== "poll") {
        set.status = 400;
        return { error: "This story is not a poll" };
      }

      if (story.isExpired) {
        set.status = 400;
        return { error: "This poll has expired" };
      }

      // Validate option_index is within range
      const content = story.content as any;
      if (body.option_index < 0 || body.option_index >= (content.options?.length ?? 0)) {
        set.status = 400;
        return { error: "Invalid option index" };
      }

      try {
        await db.insert(storyPollVotes).values({
          storyId: params.id,
          userId: user.id,
          optionIndex: body.option_index,
        });

        // Return updated results
        const pollResults = await db
          .select({
            optionIndex: storyPollVotes.optionIndex,
            count: count(),
          })
          .from(storyPollVotes)
          .where(eq(storyPollVotes.storyId, params.id))
          .groupBy(storyPollVotes.optionIndex);

        return {
          success: true,
          pollResults: pollResults.map((p) => ({ optionIndex: p.optionIndex, count: p.count })),
        };
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already voted on this poll" };
        }
        throw e;
      }
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        option_index: t.Number({ minimum: 0, maximum: 3 }),
      }),
    }
  )

  // ── Pin/Unpin story ───────────────────────────────────────────────────────
  .patch(
    "/:id/pin",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [existing] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Story not found" };
      }

      if (existing.userId !== user.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const shouldPin = body.pinned ?? !existing.isPinned;

      // Check pin limits based on user plan (Pro: 3, Ultra: unlimited)
      // For now, check a reasonable limit. Gate logic can be refined
      // when the feature flags system is implemented.
      if (shouldPin) {
        const [{ pinnedCount }] = await db
          .select({ pinnedCount: count() })
          .from(stories)
          .where(
            and(
              eq(stories.userId, user.id),
              eq(stories.isPinned, true),
            )
          );

        // Default limit: 10 pinned stories (can be adjusted via feature flags later)
        const maxPinned = (user as any).isPremium ? 999 : 3;
        if (pinnedCount >= maxPinned) {
          set.status = 400;
          return {
            error: `You can pin at most ${maxPinned} stories`,
            upgrade: !((user as any).isPremium),
          };
        }
      }

      const [updated] = await db
        .update(stories)
        .set({ isPinned: shouldPin })
        .where(eq(stories.id, params.id))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        pinned: t.Optional(t.Boolean()),
      }),
    }
  )

  // ── Upload story image ────────────────────────────────────────────────────
  .post(
    "/:id/image",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      // Verify story exists and belongs to user
      const [existing] = await db
        .select({ id: stories.id, userId: stories.userId, imageUrl: stories.imageUrl })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Story not found" };
      }

      if (existing.userId !== user.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const file = body.image;
      if (!file) {
        set.status = 400;
        return { error: "No image provided" };
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        set.status = 400;
        return { error: "Invalid file type. Accepted: JPG, PNG, WEBP, GIF" };
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        set.status = 400;
        return { error: "File too large. Maximum 10MB" };
      }

      // Delete old image if exists
      if (existing.imageUrl) {
        await storageService.delete(existing.imageUrl).catch(() => {});
      }

      // Upload new image
      const buffer = await file.arrayBuffer();
      const folder = `stories/${user.id}/${params.id}`;
      const { path } = await storageService.uploadStoryImage(buffer, folder);

      // Update story with image URL
      const [updated] = await db
        .update(stories)
        .set({ imageUrl: path })
        .where(eq(stories.id, params.id))
        .returning();

      return {
        data: updated,
        imageUrl: storageService.getImageUrl(path),
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        image: t.File({ maxSize: "10m" }),
      }),
    }
  )

  // ── List story viewers (owner only) ───────────────────────────────────────
  .get(
    "/:id/viewers",
    async (ctx: any) => {
      const { user, params, query, set } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      // Verify story exists and belongs to user
      const [story] = await db
        .select({ id: stories.id, userId: stories.userId, viewsCount: stories.viewsCount })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!story) {
        set.status = 404;
        return { error: "Story not found" };
      }

      if (story.userId !== user.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const viewers = await db
        .select({
          id: userTable.id,
          username: userTable.username,
          displayName: userTable.displayName,
          avatarUrl: userTable.avatarUrl,
          viewedAt: storyViews.viewedAt,
        })
        .from(storyViews)
        .innerJoin(userTable, eq(storyViews.viewerId, userTable.id))
        .where(eq(storyViews.storyId, params.id))
        .orderBy(desc(storyViews.viewedAt))
        .limit(limit)
        .offset(offset);

      return {
        data: viewers,
        total: story.viewsCount ?? 0,
        page,
        limit,
        hasNext: viewers.length === limit,
        hasPrev: page > 1,
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ── List story replies (owner only) ───────────────────────────────────────
  .get(
    "/:id/replies",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      // Verify story exists and belongs to user
      const [story] = await db
        .select({ id: stories.id, userId: stories.userId })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!story) {
        set.status = 404;
        return { error: "Story not found" };
      }

      if (story.userId !== user.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const replies = await db
        .select({
          id: storyReactions.id,
          reaction: storyReactions.reaction,
          textReply: storyReactions.textReply,
          createdAt: storyReactions.createdAt,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(storyReactions)
        .innerJoin(userTable, eq(storyReactions.userId, userTable.id))
        .where(
          and(
            eq(storyReactions.storyId, params.id),
            isNotNull(storyReactions.textReply),
          )
        )
        .orderBy(desc(storyReactions.createdAt));

      return { data: replies };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ── Archive: list own archived stories ────────────────────────────────────
  .get(
    "/archive",
    async (ctx: any) => {
      const { user, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const results = await db
        .select()
        .from(stories)
        .where(
          and(
            eq(stories.userId, user.id),
            eq(stories.isArchived, true),
          )
        )
        .orderBy(desc(stories.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: results,
        page,
        limit,
        hasNext: results.length === limit,
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

  // ── Archive: toggle archive status ────────────────────────────────────────
  .patch(
    "/:id/archive",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [existing] = await db
        .select({ id: stories.id, userId: stories.userId, isArchived: stories.isArchived })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Story not found" };
      }

      if (existing.userId !== user.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      const shouldArchive = body.archived ?? !existing.isArchived;

      const [updated] = await db
        .update(stories)
        .set({ isArchived: shouldArchive })
        .where(eq(stories.id, params.id))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        archived: t.Optional(t.Boolean()),
      }),
    }
  )

  // ── Quiz: submit answer ────────────────────────────────────────────────────
  .post(
    "/:id/quiz-answer",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [story] = await db
        .select({ id: stories.id, type: stories.type, content: stories.content, isExpired: stories.isExpired })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!story) { set.status = 404; return { error: "Story not found" }; }
      if (story.type !== "quiz") { set.status = 400; return { error: "This story is not a quiz" }; }
      if (story.isExpired) { set.status = 400; return { error: "This quiz has expired" }; }

      const content = story.content as any;
      if (body.answer_index < 0 || body.answer_index >= (content.options?.length ?? 0)) {
        set.status = 400;
        return { error: "Invalid answer index" };
      }

      const isCorrect = body.answer_index === content.correct_index;

      try {
        await db.insert(storyQuizAnswers).values({
          storyId: params.id,
          userId: user.id,
          answerIndex: body.answer_index,
          isCorrect,
        });
      } catch (e: any) {
        if (e.code === "23505") {
          set.status = 400;
          return { error: "Already answered this quiz" };
        }
        throw e;
      }

      // Get stats
      const stats = await db
        .select({ answerIndex: storyQuizAnswers.answerIndex, count: count() })
        .from(storyQuizAnswers)
        .where(eq(storyQuizAnswers.storyId, params.id))
        .groupBy(storyQuizAnswers.answerIndex);

      return {
        is_correct: isCorrect,
        correct_index: content.correct_index,
        stats: Object.fromEntries(stats.map((s) => [s.answerIndex, Number(s.count)])),
      };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({ answer_index: t.Number({ minimum: 0, maximum: 3 }) }),
    }
  )

  // ── Question Box: submit response ─────────────────────────────────────────
  .post(
    "/:id/question-response",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [story] = await db
        .select({ id: stories.id, type: stories.type, isExpired: stories.isExpired })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!story) { set.status = 404; return { error: "Story not found" }; }
      if (story.type !== "question_box") { set.status = 400; return { error: "This story is not a question box" }; }
      if (story.isExpired) { set.status = 400; return { error: "This question has expired" }; }

      await db
        .insert(storyQuestionResponses)
        .values({ storyId: params.id, userId: user.id, response: body.response })
        .onConflictDoUpdate({
          target: [storyQuestionResponses.storyId, storyQuestionResponses.userId],
          set: { response: body.response },
        });

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({ response: t.String({ maxLength: 500 }) }),
    }
  )

  // ── Question Box: list responses (owner only) ─────────────────────────────
  .get(
    "/:id/question-responses",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [story] = await db
        .select({ id: stories.id, userId: stories.userId })
        .from(stories)
        .where(eq(stories.id, params.id))
        .limit(1);

      if (!story) { set.status = 404; return { error: "Story not found" }; }
      if (story.userId !== user.id) { set.status = 403; return { error: "Forbidden" }; }

      const responses = await db
        .select({
          id: storyQuestionResponses.id,
          response: storyQuestionResponses.response,
          createdAt: storyQuestionResponses.createdAt,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(storyQuestionResponses)
        .innerJoin(userTable, eq(storyQuestionResponses.userId, userTable.id))
        .where(eq(storyQuestionResponses.storyId, params.id))
        .orderBy(desc(storyQuestionResponses.createdAt));

      return { data: responses };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  );
