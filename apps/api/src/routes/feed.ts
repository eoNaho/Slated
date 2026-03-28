import { Elysia } from "elysia";
import {
  db,
  activities,
  user as userTable,
  media,
  reviews,
  follows,
  clubs,
  lists,
  eq,
  desc,
  inArray,
  and,
  or,
  notInArray,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";
import { blockedUserIds } from "../lib/block-filter";
import { canViewSection } from "../lib/privacy";
import { PaginationQuery, UserIdParam } from "@pixelreel/validators";

function parseMetadata(raw: string | null | unknown): Record<string, unknown> {
  try {
    if (typeof raw === "string") return JSON.parse(raw);
    if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  } catch {}
  return {};
}

async function filterPrivateClubs<T extends { type: string; targetId: string | null | undefined }>(
  results: T[]
): Promise<T[]> {
  const clubIds = results
    .filter((r) => r.type === "club" && r.targetId)
    .map((r) => r.targetId as string);

  if (clubIds.length === 0) return results;

  const visibleClubs = await db
    .select({ id: clubs.id })
    .from(clubs)
    .where(and(inArray(clubs.id, clubIds), or(eq(clubs.isPublic, true), eq(clubs.allowJoinRequests, true))));

  const visibleSet = new Set(visibleClubs.map((c) => c.id));

  return results.filter((r) => r.type !== "club" || visibleSet.has(r.targetId as string));
}

type MappedActivity = {
  type: string;
  targetType: string | null;
  targetId: string | null;
  data: Record<string, unknown>;
  [key: string]: unknown;
};

async function enrichActivities(items: MappedActivity[]): Promise<MappedActivity[]> {
  const mediaIds: string[] = [];
  const reviewIds: string[] = [];
  const listIds: string[] = [];
  const episodeSeriesIds: string[] = [];

  for (const item of items) {
    if (item.targetType === "media" && item.targetId) mediaIds.push(item.targetId);
    else if (item.targetType === "review" && item.targetId) reviewIds.push(item.targetId);
    else if (item.targetType === "list" && item.targetId && !item.data?.name) listIds.push(item.targetId);
    else if (item.targetType === "episode" && item.data?.seriesId) episodeSeriesIds.push(item.data.seriesId as string);
  }

  const [mediaRows, reviewRows, listRows, seriesRows] = await Promise.all([
    mediaIds.length > 0
      ? db
          .select({
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            type: media.type,
            tmdbId: media.tmdbId,
            slug: media.slug,
          })
          .from(media)
          .where(inArray(media.id, mediaIds))
      : Promise.resolve([]),
    reviewIds.length > 0
      ? db
          .select({
            id: reviews.id,
            content: reviews.content,
            rating: reviews.rating,
            mediaTitle: media.title,
            mediaPosterPath: media.posterPath,
            mediaType: media.type,
            mediaTmdbId: media.tmdbId,
            mediaSlug: media.slug,
          })
          .from(reviews)
          .innerJoin(media, eq(reviews.mediaId, media.id))
          .where(inArray(reviews.id, reviewIds))
      : Promise.resolve([]),
    listIds.length > 0
      ? db
          .select({ id: lists.id, name: lists.name, slug: lists.slug })
          .from(lists)
          .where(inArray(lists.id, listIds))
      : Promise.resolve([]),
    episodeSeriesIds.length > 0
      ? db
          .select({
            id: media.id,
            title: media.title,
            posterPath: media.posterPath,
            type: media.type,
            tmdbId: media.tmdbId,
            slug: media.slug,
          })
          .from(media)
          .where(inArray(media.id, episodeSeriesIds))
      : Promise.resolve([]),
  ]);

  const mediaMap = Object.fromEntries(mediaRows.map((m) => [m.id, m]));
  const reviewMap = Object.fromEntries(reviewRows.map((r) => [r.id, r]));
  const listMap = Object.fromEntries(listRows.map((l) => [l.id, l]));
  const seriesMap = Object.fromEntries(seriesRows.map((s) => [s.id, s]));

  return items.map((item) => {
    if (!item.targetId) return item;

    let enriched: Record<string, unknown> = {};

    if (item.targetType === "media") {
      const m = mediaMap[item.targetId];
      if (m) enriched = { title: m.title, posterPath: m.posterPath, mediaType: m.type, id: m.tmdbId, slug: m.slug };
    } else if (item.targetType === "review") {
      const r = reviewMap[item.targetId];
      if (r) enriched = {
        title: r.mediaTitle,
        posterPath: r.mediaPosterPath,
        mediaType: r.mediaType,
        id: r.mediaTmdbId,
        slug: r.mediaSlug,
        content: r.content,
        rating: r.rating,
      };
    } else if (item.targetType === "list" && !item.data?.name) {
      const l = listMap[item.targetId];
      if (l) enriched = { name: l.name, slug: l.slug };
    } else if (item.targetType === "episode") {
      const seriesId = item.data?.seriesId as string | undefined;
      if (seriesId) {
        const s = seriesMap[seriesId];
        if (s) enriched = {
          title: s.title,
          posterPath: s.posterPath,
          mediaType: s.type,
          id: s.tmdbId,
          slug: s.slug,
        };
      }
    }

    return { ...item, data: { ...enriched, ...item.data } };
  });
}

export const feedRoutes = new Elysia({ prefix: "/feed", tags: ["Social"] })
  .use(betterAuthPlugin)

  // Get personalized feed (from followed user)
  .get(
    "/",
    async (ctx: any) => {
      const { user: authUser, query } = ctx;

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      // Use subquery to avoid loading all followed IDs into memory
      const followedSubquery = db
        .select({ id: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, authUser.id));

      // Get activities from followed users (excluding blocked)
      const results = await db
        .select({
          activity: activities,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(activities)
        .innerJoin(userTable, eq(activities.userId, userTable.id))
        .where(
          and(
            inArray(activities.userId, followedSubquery),
            notInArray(activities.userId, blockedUserIds(authUser.id)) as any
          )
        )
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      const mapped = results.map((r) => ({
        ...r.activity,
        data: parseMetadata(r.activity.metadata),
        user: r.user,
      }));
      const enriched = await enrichActivities(mapped as MappedActivity[]);
      const filtered = await filterPrivateClubs(enriched);

      return {
        data: filtered,
        page,
        limit,
        hasNext: results.length === limit,
        hasPrev: page > 1,
      };
    },
    {
      requireAuth: true,
      query: PaginationQuery,
    }
  )

  // Get global/trending feed
  .get(
    "/global",
    async (ctx: any) => {
      const { query, request } = ctx;
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const session = await getOptionalSession(request.headers);
      const authUser = session?.user ?? null;

      const whereClause = authUser
        ? (notInArray(activities.userId, blockedUserIds(authUser.id)) as any)
        : undefined;

      const results = await db
        .select({
          activity: activities,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(activities)
        .innerJoin(userTable, eq(activities.userId, userTable.id))
        .where(whereClause)
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      const mappedGlobal = results.map((r) => ({
        ...r.activity,
        data: parseMetadata(r.activity.metadata),
        user: r.user,
      }));
      const enrichedGlobal = await enrichActivities(mappedGlobal as MappedActivity[]);
      const filteredGlobal = await filterPrivateClubs(enrichedGlobal);

      return {
        data: filteredGlobal,
        page,
        limit,
        hasNext: results.length === limit,
        hasPrev: page > 1,
      };
    },
    { query: PaginationQuery }
  )

  // Get user-specific feed
  .get(
    "/user/:userId",
    async (ctx: any) => {
      const { params, query, request, set } = ctx;
      const session = await getOptionalSession(request.headers);
      const viewerId = session?.user?.id ?? null;

      const allowed = await canViewSection(viewerId, params.userId, "activity");
      if (!allowed) {
        set.status = 403;
        return { error: "This content is private" };
      }

      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 20, 50);
      const offset = (page - 1) * limit;

      const results = await db
        .select({
          activity: activities,
          user: {
            id: userTable.id,
            username: userTable.username,
            displayName: userTable.displayName,
            avatarUrl: userTable.avatarUrl,
          },
        })
        .from(activities)
        .innerJoin(userTable, eq(activities.userId, userTable.id))
        .where(eq(activities.userId, params.userId))
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      const mappedUser = results.map((r) => ({
        ...r.activity,
        data: parseMetadata(r.activity.metadata),
        user: r.user,
      }));
      const enrichedUser = await enrichActivities(mappedUser as MappedActivity[]);
      const filteredUser = await filterPrivateClubs(enrichedUser);

      return {
        data: filteredUser,
        page,
        limit,
        hasNext: results.length === limit,
        hasPrev: page > 1,
      };
    },
    {
      params: UserIdParam,
      query: PaginationQuery,
    }
  );
