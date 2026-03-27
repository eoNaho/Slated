import { Elysia, t } from "elysia";
import {
  db,
  user as userTable,
  clubs,
  clubMembers,
  clubWatchlistItems,
  clubScreeningEvents,
  clubEventRsvps,
  clubPosts,
  clubPostComments,
  clubPolls,
  clubPollOptions,
  clubPollVotes,
  clubPostVotes,
  clubCommentVotes,
  clubFlairs,
  eq,
  and,
  desc,
  asc,
  count,
  inArray,
  or,
  sql,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";

async function getMembership(clubId: string, userId: string | null | undefined) {
  if (!userId) return null;
  const [membership] = await db
    .select({ role: clubMembers.role })
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)))
    .limit(1);
  return membership ?? null;
}

async function requireMember(clubId: string, userId: string, set: any) {
  const m = await getMembership(clubId, userId);
  if (!m) {
    set.status = 403;
    return null;
  }
  return m;
}

async function requireModOrOwner(clubId: string, userId: string, set: any) {
  const m = await getMembership(clubId, userId);
  if (!m || m.role === "member") {
    set.status = 403;
    return null;
  }
  return m;
}

async function getClubOrFail(clubId: string, set: any) {
  const [club] = await db
    .select({ id: clubs.id, isPublic: clubs.isPublic })
    .from(clubs)
    .where(eq(clubs.id, clubId))
    .limit(1);
  if (!club) {
    set.status = 404;
    return null;
  }
  return club;
}

export const clubContentRoutes = new Elysia({ prefix: "/clubs", tags: ["Club Content"] })
  .use(betterAuthPlugin)

  // ══════════════════════════════════════════════════════════════════════════
  //  SHARED WATCHLIST
  // ══════════════════════════════════════════════════════════════════════════

  .get(
    "/:id/watchlist",
    async (ctx: any) => {
      const { params, query, set } = ctx;

      const club = await getClubOrFail(params.id, set);
      if (!club) return;

      if (!club.isPublic) {
        const m = await getMembership(params.id, ctx.user?.id);
        if (!m) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(Number(query?.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const items = await db
        .select({
          item: clubWatchlistItems,
          suggestedBy: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(clubWatchlistItems)
        .leftJoin(userTable, eq(clubWatchlistItems.suggestedBy, userTable.id))
        .where(eq(clubWatchlistItems.clubId, params.id))
        .orderBy(asc(clubWatchlistItems.addedAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(clubWatchlistItems)
        .where(eq(clubWatchlistItems.clubId, params.id));

      return {
        data: items.map((i) => ({ ...i.item, suggestedBy: i.suggestedBy })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/:id/watchlist",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireMember(params.id, user.id, set);
      if (!m) return { error: "You must be a member to add to the watchlist" };

      const [item] = await db
        .insert(clubWatchlistItems)
        .values({
          clubId: params.id,
          mediaId: body.mediaId,
          mediaTitle: body.mediaTitle,
          mediaPosterPath: body.mediaPosterPath,
          mediaType: body.mediaType,
          suggestedBy: user.id,
          note: body.note,
        })
        .returning();

      return { data: item };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        mediaId: t.Optional(t.String()),
        mediaTitle: t.String({ minLength: 1, maxLength: 200 }),
        mediaPosterPath: t.Optional(t.String()),
        mediaType: t.Union([t.Literal("movie"), t.Literal("series")]),
        note: t.Optional(t.String({ maxLength: 300 })),
      }),
    }
  )

  .patch(
    "/:id/watchlist/:itemId/watched",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireModOrOwner(params.id, user.id, set);
      if (!m) return { error: "Only owners and moderators can mark items as watched" };

      const [updated] = await db
        .update(clubWatchlistItems)
        .set({
          isWatched: body.isWatched,
          watchedAt: body.isWatched ? new Date() : null,
        })
        .where(and(eq(clubWatchlistItems.id, params.itemId), eq(clubWatchlistItems.clubId, params.id)))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "Watchlist item not found" };
      }

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), itemId: t.String() }),
      body: t.Object({ isWatched: t.Boolean() }),
    }
  )

  .delete(
    "/:id/watchlist/:itemId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [item] = await db
        .select({ suggestedBy: clubWatchlistItems.suggestedBy })
        .from(clubWatchlistItems)
        .where(and(eq(clubWatchlistItems.id, params.itemId), eq(clubWatchlistItems.clubId, params.id)))
        .limit(1);

      if (!item) {
        set.status = 404;
        return { error: "Item not found" };
      }

      const m = await getMembership(params.id, user.id);
      if (!m) {
        set.status = 403;
        return { error: "Not a member" };
      }

      // Allow: the person who suggested it, or owner/mod
      const canDelete = item.suggestedBy === user.id || m.role === "owner" || m.role === "moderator";
      if (!canDelete) {
        set.status = 403;
        return { error: "You can only remove items you suggested" };
      }

      await db
        .delete(clubWatchlistItems)
        .where(and(eq(clubWatchlistItems.id, params.itemId), eq(clubWatchlistItems.clubId, params.id)));

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), itemId: t.String() }),
    }
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  SCREENING EVENTS
  // ══════════════════════════════════════════════════════════════════════════

  .get(
    "/:id/events",
    async (ctx: any) => {
      const { params, query, set } = ctx;

      const club = await getClubOrFail(params.id, set);
      if (!club) return;

      if (!club.isPublic) {
        const m = await getMembership(params.id, ctx.user?.id);
        if (!m) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      const upcoming = query?.upcoming === "true";
      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(Number(query?.limit) || 10, 50);
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(clubScreeningEvents.clubId, params.id)];
      if (upcoming) {
        conditions.push(
          // @ts-ignore
          (db as any).sql`${clubScreeningEvents.scheduledAt} >= NOW()`
        );
      }

      const events = await db
        .select({
          event: clubScreeningEvents,
          createdBy: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(clubScreeningEvents)
        .innerJoin(userTable, eq(clubScreeningEvents.createdBy, userTable.id))
        .where(and(...conditions))
        .orderBy(asc(clubScreeningEvents.scheduledAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(clubScreeningEvents)
        .where(and(...conditions));

      // Attach user's RSVP if logged in
      const sessionUser = ctx.user;
      let myRsvps: Record<string, string> = {};
      if (sessionUser && events.length > 0) {
        const eventIds = events.map((e) => e.event.id);
        const rsvps = await db
          .select({ eventId: clubEventRsvps.eventId, status: clubEventRsvps.status })
          .from(clubEventRsvps)
          .where(
            and(
              eq(clubEventRsvps.userId, sessionUser.id),
              // @ts-ignore
              (db as any).sql`${clubEventRsvps.eventId} = ANY(${eventIds}::uuid[])`
            )
          );
        myRsvps = Object.fromEntries(rsvps.map((r) => [r.eventId, r.status]));
      }

      return {
        data: events.map((e) => ({
          ...e.event,
          createdBy: e.createdBy,
          myRsvp: myRsvps[e.event.id] ?? null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        upcoming: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/:id/events",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireModOrOwner(params.id, user.id, set);
      if (!m) return { error: "Only owners and moderators can create events" };

      const [event] = await db
        .insert(clubScreeningEvents)
        .values({
          clubId: params.id,
          title: body.title,
          description: body.description,
          eventType: body.eventType,
          mediaId: body.mediaId,
          mediaTitle: body.mediaTitle,
          mediaPosterPath: body.mediaPosterPath,
          scheduledAt: new Date(body.scheduledAt),
          meetLink: body.meetLink,
          createdBy: user.id,
        })
        .returning();

      return { data: event };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.String({ minLength: 3, maxLength: 100 }),
        description: t.Optional(t.String({ maxLength: 500 })),
        eventType: t.Union([t.Literal("watch"), t.Literal("discussion")], { default: "watch" }),
        scheduledAt: t.String(),
        mediaId: t.Optional(t.String()),
        mediaTitle: t.Optional(t.String()),
        mediaPosterPath: t.Optional(t.String()),
        meetLink: t.Optional(t.String({ maxLength: 300 })),
      }),
    }
  )

  .patch(
    "/:id/events/:eventId",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [event] = await db
        .select({ createdBy: clubScreeningEvents.createdBy })
        .from(clubScreeningEvents)
        .where(and(eq(clubScreeningEvents.id, params.eventId), eq(clubScreeningEvents.clubId, params.id)))
        .limit(1);

      if (!event) {
        set.status = 404;
        return { error: "Event not found" };
      }

      const m = await getMembership(params.id, user.id);
      const canEdit = event.createdBy === user.id || (m && m.role !== "member");
      if (!canEdit) {
        set.status = 403;
        return { error: "Only the creator, owners, or moderators can edit events" };
      }

      const updates: any = { updatedAt: new Date() };
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.eventType !== undefined) updates.eventType = body.eventType;
      if (body.scheduledAt !== undefined) updates.scheduledAt = new Date(body.scheduledAt);
      if (body.meetLink !== undefined) updates.meetLink = body.meetLink;
      if (body.mediaId !== undefined) updates.mediaId = body.mediaId;
      if (body.mediaTitle !== undefined) updates.mediaTitle = body.mediaTitle;
      if (body.mediaPosterPath !== undefined) updates.mediaPosterPath = body.mediaPosterPath;

      const [updated] = await db
        .update(clubScreeningEvents)
        .set(updates)
        .where(eq(clubScreeningEvents.id, params.eventId))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), eventId: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 3, maxLength: 100 })),
        description: t.Optional(t.String({ maxLength: 500 })),
        eventType: t.Optional(t.Union([t.Literal("watch"), t.Literal("discussion")])),
        scheduledAt: t.Optional(t.String()),
        meetLink: t.Optional(t.String({ maxLength: 300 })),
        mediaId: t.Optional(t.String()),
        mediaTitle: t.Optional(t.String()),
        mediaPosterPath: t.Optional(t.String()),
      }),
    }
  )

  .delete(
    "/:id/events/:eventId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [event] = await db
        .select({ createdBy: clubScreeningEvents.createdBy })
        .from(clubScreeningEvents)
        .where(and(eq(clubScreeningEvents.id, params.eventId), eq(clubScreeningEvents.clubId, params.id)))
        .limit(1);

      if (!event) {
        set.status = 404;
        return { error: "Event not found" };
      }

      const m = await getMembership(params.id, user.id);
      const canDelete = event.createdBy === user.id || (m && m.role !== "member");
      if (!canDelete) {
        set.status = 403;
        return { error: "Only the creator, owners, or moderators can delete events" };
      }

      await db.delete(clubScreeningEvents).where(eq(clubScreeningEvents.id, params.eventId));
      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), eventId: t.String() }),
    }
  )

  .post(
    "/:id/events/:eventId/rsvp",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireMember(params.id, user.id, set);
      if (!m) return { error: "You must be a member to RSVP" };

      const [event] = await db
        .select({ id: clubScreeningEvents.id, goingCount: clubScreeningEvents.goingCount, interestedCount: clubScreeningEvents.interestedCount })
        .from(clubScreeningEvents)
        .where(and(eq(clubScreeningEvents.id, params.eventId), eq(clubScreeningEvents.clubId, params.id)))
        .limit(1);

      if (!event) {
        set.status = 404;
        return { error: "Event not found" };
      }

      // Check existing RSVP
      const [existing] = await db
        .select()
        .from(clubEventRsvps)
        .where(and(eq(clubEventRsvps.eventId, params.eventId), eq(clubEventRsvps.userId, user.id)))
        .limit(1);

      const oldStatus = existing?.status ?? null;
      const newStatus = body.status;

      if (existing) {
        await db
          .update(clubEventRsvps)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(clubEventRsvps.id, existing.id));
      } else {
        await db.insert(clubEventRsvps).values({
          eventId: params.eventId,
          userId: user.id,
          status: newStatus,
        });
      }

      // Update event counters
      const goingDelta =
        (newStatus === "going" ? 1 : 0) - (oldStatus === "going" ? 1 : 0);
      const interestedDelta =
        (newStatus === "interested" ? 1 : 0) - (oldStatus === "interested" ? 1 : 0);

      if (goingDelta !== 0 || interestedDelta !== 0) {
        await db
          .update(clubScreeningEvents)
          .set({
            goingCount: Math.max(0, event.goingCount + goingDelta),
            interestedCount: Math.max(0, event.interestedCount + interestedDelta),
          })
          .where(eq(clubScreeningEvents.id, params.eventId));
      }

      return { success: true, rsvp: newStatus };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), eventId: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal("going"), t.Literal("interested"), t.Literal("not_going")]),
      }),
    }
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  POSTS (discussions + pinned announcements)
  // ══════════════════════════════════════════════════════════════════════════

  .get(
    "/:id/posts",
    async (ctx: any) => {
      const { params, query, set } = ctx;

      const club = await getClubOrFail(params.id, set);
      if (!club) return;

      if (!club.isPublic) {
        const m = await getMembership(params.id, ctx.user?.id);
        if (!m) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(Number(query?.limit) || 20, 50);
      const offset = (page - 1) * limit;
      const pinned = query?.pinned === "true";
      const sort = query?.sort ?? "hot"; // hot | new | top
      const timeframe = query?.timeframe ?? "week"; // day | week | month | year | all

      const conditions: any[] = [eq(clubPosts.clubId, params.id)];
      if (pinned) conditions.push(eq(clubPosts.isPinned, true));

      // Timeframe filter (only for sort=top)
      if (sort === "top" && timeframe !== "all") {
        const intervals: Record<string, string> = {
          day: "1 day",
          week: "7 days",
          month: "30 days",
          year: "365 days",
        };
        const interval = intervals[timeframe] ?? "7 days";
        conditions.push(sql`${clubPosts.createdAt} >= NOW() - INTERVAL ${sql.raw(`'${interval}'`)}`);
      }

      // Order by sort mode
      let orderClause: any[];
      if (sort === "new") {
        orderClause = [desc(clubPosts.isPinned), desc(clubPosts.createdAt)];
      } else if (sort === "top") {
        orderClause = [desc(clubPosts.isPinned), desc(clubPosts.score), desc(clubPosts.createdAt)];
      } else {
        // hot: Wilson-like score decay  — score / (hours + 2)^1.5
        orderClause = [
          desc(clubPosts.isPinned),
          sql`(${clubPosts.score}::float / POWER(EXTRACT(EPOCH FROM (NOW() - ${clubPosts.createdAt})) / 3600 + 2, 1.5)) DESC`,
        ];
      }

      const posts = await db
        .select({
          post: clubPosts,
          author: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(clubPosts)
        .innerJoin(userTable, eq(clubPosts.userId, userTable.id))
        .where(and(...conditions))
        .orderBy(...orderClause)
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(clubPosts)
        .where(and(...conditions));

      // Attach myVote if logged in
      const authUser = ctx.user;
      let voteMap: Record<string, number> = {};
      if (authUser && posts.length > 0) {
        const postIds = posts.map((p) => p.post.id);
        const myVotes = await db
          .select({ postId: clubPostVotes.postId, value: clubPostVotes.value })
          .from(clubPostVotes)
          .where(and(inArray(clubPostVotes.postId, postIds), eq(clubPostVotes.userId, authUser.id)));
        voteMap = Object.fromEntries(myVotes.map((v) => [v.postId, v.value]));
      }

      return {
        data: posts.map((p) => ({ ...p.post, author: p.author, myVote: voteMap[p.post.id] ?? null })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        pinned: t.Optional(t.String()),
        sort: t.Optional(t.String()),
        timeframe: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/:id/posts",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireMember(params.id, user.id, set);
      if (!m) return { error: "You must be a member to post" };

      // Only owner/mod can pin
      if (body.isPinned && m.role === "member") {
        set.status = 403;
        return { error: "Only owners and moderators can pin posts" };
      }

      const [post] = await db
        .insert(clubPosts)
        .values({
          clubId: params.id,
          userId: user.id,
          mediaId: body.mediaId,
          mediaTitle: body.mediaTitle,
          title: body.title,
          content: body.content,
          isPinned: body.isPinned ?? false,
          flair: body.flair ?? null,
          flairColor: body.flairColor ?? null,
        })
        .returning();

      return { data: post };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.String({ minLength: 3, maxLength: 150 }),
        content: t.String({ minLength: 1, maxLength: 5000 }),
        mediaId: t.Optional(t.String()),
        mediaTitle: t.Optional(t.String()),
        isPinned: t.Optional(t.Boolean()),
        flair: t.Optional(t.String({ maxLength: 50 })),
        flairColor: t.Optional(t.String({ maxLength: 20 })),
      }),
    }
  )

  .patch(
    "/:id/posts/:postId",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const [post] = await db
        .select({ userId: clubPosts.userId, isPinned: clubPosts.isPinned })
        .from(clubPosts)
        .where(and(eq(clubPosts.id, params.postId), eq(clubPosts.clubId, params.id)))
        .limit(1);

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const m = await getMembership(params.id, user.id);
      const isAuthor = post.userId === user.id;
      const isMod = m && m.role !== "member";

      if (!isAuthor && !isMod) {
        set.status = 403;
        return { error: "Only the author, owners, or moderators can edit posts" };
      }

      const updates: any = { updatedAt: new Date() };
      if (body.title !== undefined) updates.title = body.title;
      if (body.content !== undefined) updates.content = body.content;
      if (body.flair !== undefined) updates.flair = body.flair;
      if (body.flairColor !== undefined) updates.flairColor = body.flairColor;

      const [updated] = await db
        .update(clubPosts)
        .set(updates)
        .where(eq(clubPosts.id, params.postId))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), postId: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 3, maxLength: 150 })),
        content: t.Optional(t.String({ minLength: 1, maxLength: 5000 })),
        flair: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
        flairColor: t.Optional(t.Nullable(t.String({ maxLength: 20 }))),
      }),
    }
  )

  .delete(
    "/:id/posts/:postId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [post] = await db
        .select({ userId: clubPosts.userId })
        .from(clubPosts)
        .where(and(eq(clubPosts.id, params.postId), eq(clubPosts.clubId, params.id)))
        .limit(1);

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const m = await getMembership(params.id, user.id);
      const canDelete = post.userId === user.id || (m && m.role !== "member");
      if (!canDelete) {
        set.status = 403;
        return { error: "Only the author, owners, or moderators can delete posts" };
      }

      await db.delete(clubPosts).where(eq(clubPosts.id, params.postId));
      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), postId: t.String() }),
    }
  )

  .post(
    "/:id/posts/:postId/pin",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireModOrOwner(params.id, user.id, set);
      if (!m) return { error: "Only owners and moderators can pin posts" };

      const [post] = await db
        .select({ id: clubPosts.id })
        .from(clubPosts)
        .where(and(eq(clubPosts.id, params.postId), eq(clubPosts.clubId, params.id)))
        .limit(1);

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const [updated] = await db
        .update(clubPosts)
        .set({ isPinned: body.pinned })
        .where(eq(clubPosts.id, params.postId))
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), postId: t.String() }),
      body: t.Object({ pinned: t.Boolean() }),
    }
  )

  // ─── Post votes ────────────────────────────────────────────────────────────

  .post(
    "/:id/posts/:postId/vote",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireMember(params.id, user.id, set);
      if (!m) return { error: "You must be a member to vote" };

      const [post] = await db
        .select({ id: clubPosts.id, upvoteCount: clubPosts.upvoteCount, downvoteCount: clubPosts.downvoteCount, score: clubPosts.score })
        .from(clubPosts)
        .where(and(eq(clubPosts.id, params.postId), eq(clubPosts.clubId, params.id)))
        .limit(1);

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const [existing] = await db
        .select()
        .from(clubPostVotes)
        .where(and(eq(clubPostVotes.postId, params.postId), eq(clubPostVotes.userId, user.id)))
        .limit(1);

      const newValue: number = body.value;
      let upDelta = 0;
      let downDelta = 0;

      if (existing) {
        if (existing.value === newValue) {
          // Same vote — remove it (toggle off)
          await db.delete(clubPostVotes).where(eq(clubPostVotes.id, existing.id));
          upDelta = newValue === 1 ? -1 : 0;
          downDelta = newValue === -1 ? -1 : 0;
        } else {
          // Changed vote
          await db.update(clubPostVotes).set({ value: newValue }).where(eq(clubPostVotes.id, existing.id));
          upDelta = newValue === 1 ? 1 : -1;
          downDelta = newValue === -1 ? 1 : -1;
        }
      } else {
        await db.insert(clubPostVotes).values({ postId: params.postId, userId: user.id, value: newValue });
        upDelta = newValue === 1 ? 1 : 0;
        downDelta = newValue === -1 ? 1 : 0;
      }

      const newUp = Math.max(0, post.upvoteCount + upDelta);
      const newDown = Math.max(0, post.downvoteCount + downDelta);
      await db
        .update(clubPosts)
        .set({ upvoteCount: newUp, downvoteCount: newDown, score: newUp - newDown })
        .where(eq(clubPosts.id, params.postId));

      return { success: true, upvoteCount: newUp, downvoteCount: newDown, score: newUp - newDown };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), postId: t.String() }),
      body: t.Object({ value: t.Union([t.Literal(1), t.Literal(-1)]) }),
    }
  )

  // ─── Post comments ─────────────────────────────────────────────────────────

  .get(
    "/:id/posts/:postId/comments",
    async (ctx: any) => {
      const { params, set } = ctx;

      const [post] = await db
        .select({ id: clubPosts.id })
        .from(clubPosts)
        .where(and(eq(clubPosts.id, params.postId), eq(clubPosts.clubId, params.id)))
        .limit(1);

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      const comments = await db
        .select({
          comment: clubPostComments,
          author: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(clubPostComments)
        .innerJoin(userTable, eq(clubPostComments.userId, userTable.id))
        .where(eq(clubPostComments.postId, params.postId))
        .orderBy(asc(clubPostComments.createdAt));

      // Attach myVote if logged in
      const authUser = ctx.user;
      let voteMap: Record<string, number> = {};
      if (authUser && comments.length > 0) {
        const commentIds = comments.map((c) => c.comment.id);
        const myVotes = await db
          .select({ commentId: clubCommentVotes.commentId, value: clubCommentVotes.value })
          .from(clubCommentVotes)
          .where(and(inArray(clubCommentVotes.commentId, commentIds), eq(clubCommentVotes.userId, authUser.id)));
        voteMap = Object.fromEntries(myVotes.map((v) => [v.commentId, v.value]));
      }

      return {
        data: comments.map((c) => ({ ...c.comment, author: c.author, myVote: voteMap[c.comment.id] ?? null })),
      };
    },
    {
      params: t.Object({ id: t.String(), postId: t.String() }),
    }
  )

  .post(
    "/:id/posts/:postId/comments",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireMember(params.id, user.id, set);
      if (!m) return { error: "You must be a member to comment" };

      const [post] = await db
        .select({ id: clubPosts.id })
        .from(clubPosts)
        .where(and(eq(clubPosts.id, params.postId), eq(clubPosts.clubId, params.id)))
        .limit(1);

      if (!post) {
        set.status = 404;
        return { error: "Post not found" };
      }

      // Calculate depth from parent
      let depth = 0;
      if (body.parentId) {
        const [parent] = await db
          .select({ depth: clubPostComments.depth, postId: clubPostComments.postId })
          .from(clubPostComments)
          .where(eq(clubPostComments.id, body.parentId))
          .limit(1);

        if (!parent || parent.postId !== params.postId) {
          set.status = 400;
          return { error: "Invalid parentId" };
        }
        depth = Math.min((parent.depth ?? 0) + 1, 5);
      }

      const [comment] = await db
        .insert(clubPostComments)
        .values({
          postId: params.postId,
          userId: user.id,
          content: body.content,
          parentId: body.parentId ?? null,
          depth,
        })
        .returning();

      // Increment comment counter
      await db
        .update(clubPosts)
        .set({ commentsCount: sql`${clubPosts.commentsCount} + 1` })
        .where(eq(clubPosts.id, params.postId));

      return { data: comment };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), postId: t.String() }),
      body: t.Object({
        content: t.String({ minLength: 1, maxLength: 1000 }),
        parentId: t.Optional(t.String()),
      }),
    }
  )

  // ─── Comment votes ──────────────────────────────────────────────────────────

  .post(
    "/:id/posts/:postId/comments/:commentId/vote",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireMember(params.id, user.id, set);
      if (!m) return { error: "You must be a member to vote" };

      const [comment] = await db
        .select({ id: clubPostComments.id, upvoteCount: clubPostComments.upvoteCount, downvoteCount: clubPostComments.downvoteCount })
        .from(clubPostComments)
        .where(and(eq(clubPostComments.id, params.commentId), eq(clubPostComments.postId, params.postId)))
        .limit(1);

      if (!comment) {
        set.status = 404;
        return { error: "Comment not found" };
      }

      const [existing] = await db
        .select()
        .from(clubCommentVotes)
        .where(and(eq(clubCommentVotes.commentId, params.commentId), eq(clubCommentVotes.userId, user.id)))
        .limit(1);

      const newValue: number = body.value;
      let upDelta = 0;
      let downDelta = 0;

      if (existing) {
        if (existing.value === newValue) {
          await db.delete(clubCommentVotes).where(eq(clubCommentVotes.id, existing.id));
          upDelta = newValue === 1 ? -1 : 0;
          downDelta = newValue === -1 ? -1 : 0;
        } else {
          await db.update(clubCommentVotes).set({ value: newValue }).where(eq(clubCommentVotes.id, existing.id));
          upDelta = newValue === 1 ? 1 : -1;
          downDelta = newValue === -1 ? 1 : -1;
        }
      } else {
        await db.insert(clubCommentVotes).values({ commentId: params.commentId, userId: user.id, value: newValue });
        upDelta = newValue === 1 ? 1 : 0;
        downDelta = newValue === -1 ? 1 : 0;
      }

      const newUp = Math.max(0, comment.upvoteCount + upDelta);
      const newDown = Math.max(0, comment.downvoteCount + downDelta);
      await db
        .update(clubPostComments)
        .set({ upvoteCount: newUp, downvoteCount: newDown, score: newUp - newDown })
        .where(eq(clubPostComments.id, params.commentId));

      return { success: true, upvoteCount: newUp, downvoteCount: newDown, score: newUp - newDown };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), postId: t.String(), commentId: t.String() }),
      body: t.Object({ value: t.Union([t.Literal(1), t.Literal(-1)]) }),
    }
  )

  .delete(
    "/:id/posts/:postId/comments/:commentId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [comment] = await db
        .select({ userId: clubPostComments.userId })
        .from(clubPostComments)
        .where(and(eq(clubPostComments.id, params.commentId), eq(clubPostComments.postId, params.postId)))
        .limit(1);

      if (!comment) {
        set.status = 404;
        return { error: "Comment not found" };
      }

      const m = await getMembership(params.id, user.id);
      const canDelete = comment.userId === user.id || (m && m.role !== "member");
      if (!canDelete) {
        set.status = 403;
        return { error: "Only the author, owners, or moderators can delete comments" };
      }

      await db.delete(clubPostComments).where(eq(clubPostComments.id, params.commentId));
      await db
        .update(clubPosts)
        .set({ commentsCount: sql`GREATEST(${clubPosts.commentsCount} - 1, 0)` })
        .where(eq(clubPosts.id, params.postId));

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), postId: t.String(), commentId: t.String() }),
    }
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  FLAIRS
  // ══════════════════════════════════════════════════════════════════════════

  .get(
    "/:id/flairs",
    async (ctx: any) => {
      const { params, set } = ctx;

      const club = await getClubOrFail(params.id, set);
      if (!club) return;

      if (!club.isPublic) {
        const m = await getMembership(params.id, ctx.user?.id);
        if (!m) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      const flairs = await db
        .select()
        .from(clubFlairs)
        .where(eq(clubFlairs.clubId, params.id))
        .orderBy(asc(clubFlairs.name));

      return { data: flairs };
    },
    { params: t.Object({ id: t.String() }) }
  )

  .post(
    "/:id/flairs",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireModOrOwner(params.id, user.id, set);
      if (!m) return { error: "Only moderators and owners can manage flairs" };

      const [flair] = await db
        .insert(clubFlairs)
        .values({ clubId: params.id, name: body.name, color: body.color })
        .returning();

      return { data: flair };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 50 }),
        color: t.String({ minLength: 4, maxLength: 20 }),
      }),
    }
  )

  .delete(
    "/:id/flairs/:flairId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const m = await requireModOrOwner(params.id, user.id, set);
      if (!m) return { error: "Only moderators and owners can manage flairs" };

      await db.delete(clubFlairs).where(and(eq(clubFlairs.id, params.flairId), eq(clubFlairs.clubId, params.id)));
      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), flairId: t.String() }),
    }
  )

  // ══════════════════════════════════════════════════════════════════════════
  //  POLLS
  // ══════════════════════════════════════════════════════════════════════════

  .get(
    "/:id/polls",
    async (ctx: any) => {
      const { params, query, set } = ctx;

      const club = await getClubOrFail(params.id, set);
      if (!club) return;

      if (!club.isPublic) {
        const m = await getMembership(params.id, ctx.user?.id);
        if (!m) {
          set.status = 403;
          return { error: "This club is private" };
        }
      }

      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(Number(query?.limit) || 10, 50);
      const offset = (page - 1) * limit;

      const polls = await db
        .select({
          poll: clubPolls,
          createdBy: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(clubPolls)
        .innerJoin(userTable, eq(clubPolls.createdBy, userTable.id))
        .where(eq(clubPolls.clubId, params.id))
        .orderBy(desc(clubPolls.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(clubPolls)
        .where(eq(clubPolls.clubId, params.id));

      // Load options for each poll
      const pollIds = polls.map((p) => p.poll.id);
      const options = pollIds.length > 0
        ? await db
            .select()
            .from(clubPollOptions)
            .where(
              // @ts-ignore
              (db as any).sql`${clubPollOptions.pollId} = ANY(${pollIds}::uuid[])`
            )
        : [];

      // Load user's votes if logged in
      const sessionUser = ctx.user;
      let myVotes: Record<string, string> = {};
      if (sessionUser && pollIds.length > 0) {
        const votes = await db
          .select({ pollId: clubPollVotes.pollId, optionId: clubPollVotes.optionId })
          .from(clubPollVotes)
          .where(
            and(
              eq(clubPollVotes.userId, sessionUser.id),
              // @ts-ignore
              (db as any).sql`${clubPollVotes.pollId} = ANY(${pollIds}::uuid[])`
            )
          );
        myVotes = Object.fromEntries(votes.map((v) => [v.pollId, v.optionId]));
      }

      const optionsByPoll = options.reduce<Record<string, typeof options>>((acc, opt) => {
        if (!acc[opt.pollId]) acc[opt.pollId] = [];
        acc[opt.pollId].push(opt);
        return acc;
      }, {});

      return {
        data: polls.map((p) => ({
          ...p.poll,
          createdBy: p.createdBy,
          options: optionsByPoll[p.poll.id] ?? [],
          myVote: myVotes[p.poll.id] ?? null,
          isExpired: p.poll.expiresAt ? new Date() > p.poll.expiresAt : false,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  .post(
    "/:id/polls",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireMember(params.id, user.id, set);
      if (!m) return { error: "You must be a member to create polls" };

      if (body.options.length < 2 || body.options.length > 10) {
        set.status = 400;
        return { error: "Polls must have between 2 and 10 options" };
      }

      const [poll] = await db
        .insert(clubPolls)
        .values({
          clubId: params.id,
          createdBy: user.id,
          question: body.question,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        })
        .returning();

      const insertedOptions = await db
        .insert(clubPollOptions)
        .values(
          body.options.map((opt: any) => ({
            pollId: poll.id,
            text: opt.text,
            mediaId: opt.mediaId ?? null,
            mediaPosterPath: opt.mediaPosterPath ?? null,
          }))
        )
        .returning();

      return { data: { ...poll, options: insertedOptions } };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        question: t.String({ minLength: 5, maxLength: 300 }),
        expiresAt: t.Optional(t.String()),
        options: t.Array(
          t.Object({
            text: t.String({ minLength: 1, maxLength: 100 }),
            mediaId: t.Optional(t.String()),
            mediaPosterPath: t.Optional(t.String()),
          }),
          { minItems: 2, maxItems: 10 }
        ),
      }),
    }
  )

  .post(
    "/:id/polls/:pollId/vote",
    async (ctx: any) => {
      const { user, params, body, set } = ctx;

      const m = await requireMember(params.id, user.id, set);
      if (!m) return { error: "You must be a member to vote" };

      const [poll] = await db
        .select()
        .from(clubPolls)
        .where(and(eq(clubPolls.id, params.pollId), eq(clubPolls.clubId, params.id)))
        .limit(1);

      if (!poll) {
        set.status = 404;
        return { error: "Poll not found" };
      }

      if (poll.expiresAt && new Date() > poll.expiresAt) {
        set.status = 400;
        return { error: "This poll has expired" };
      }

      // Validate option belongs to this poll
      const [option] = await db
        .select()
        .from(clubPollOptions)
        .where(and(eq(clubPollOptions.id, body.optionId), eq(clubPollOptions.pollId, params.pollId)))
        .limit(1);

      if (!option) {
        set.status = 404;
        return { error: "Option not found" };
      }

      // Check existing vote
      const [existing] = await db
        .select()
        .from(clubPollVotes)
        .where(and(eq(clubPollVotes.pollId, params.pollId), eq(clubPollVotes.userId, user.id)))
        .limit(1);

      if (existing) {
        if (existing.optionId === body.optionId) {
          set.status = 400;
          return { error: "Already voted for this option" };
        }

        // Change vote: decrement old option, increment new
        await db
          .update(clubPollOptions)
          .set({ votesCount: sql`GREATEST(${clubPollOptions.votesCount} - 1, 0)` })
          .where(eq(clubPollOptions.id, existing.optionId));

        await db
          .update(clubPollVotes)
          .set({ optionId: body.optionId })
          .where(eq(clubPollVotes.id, existing.id));
      } else {
        await db.insert(clubPollVotes).values({
          pollId: params.pollId,
          optionId: body.optionId,
          userId: user.id,
        });

        await db
          .update(clubPolls)
          .set({ totalVotes: sql`${clubPolls.totalVotes} + 1` })
          .where(eq(clubPolls.id, params.pollId));
      }

      // Increment new option count
      await db
        .update(clubPollOptions)
        .set({ votesCount: sql`${clubPollOptions.votesCount} + 1` })
        .where(eq(clubPollOptions.id, body.optionId));

      return { success: true, votedFor: body.optionId };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), pollId: t.String() }),
      body: t.Object({ optionId: t.String() }),
    }
  )

  // Delete a poll (creator, owner, or moderator)
  .delete(
    "/:id/polls/:pollId",
    async (ctx: any) => {
      const { user, params, set } = ctx;

      const [member] = await db
        .select({ role: clubMembers.role })
        .from(clubMembers)
        .where(and(eq(clubMembers.clubId, params.id), eq(clubMembers.userId, user.id)))
        .limit(1);

      if (!member) {
        set.status = 403;
        return { error: "Not a member" };
      }

      const [poll] = await db
        .select({ id: clubPolls.id, createdBy: clubPolls.createdBy })
        .from(clubPolls)
        .where(and(eq(clubPolls.id, params.pollId), eq(clubPolls.clubId, params.id)))
        .limit(1);

      if (!poll) {
        set.status = 404;
        return { error: "Poll not found" };
      }

      const isAdmin = member.role === "owner" || member.role === "moderator";
      if (!isAdmin && poll.createdBy !== user.id) {
        set.status = 403;
        return { error: "Not authorized" };
      }

      await db.delete(clubPolls).where(eq(clubPolls.id, params.pollId));

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String(), pollId: t.String() }),
    }
  );
