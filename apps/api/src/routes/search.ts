import { Elysia, t } from "elysia";
import { db, user, media, lists, ilike, or, desc, and, eq, inArray, notInArray } from "../db";
import { metadataService } from "../services/metadata.service";
import { storageService } from "../services/storage";
import { logger } from "../utils/logger";
import { getOptionalSession } from "../lib/auth";
import { blockedUserIds } from "../lib/block-filter";

function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

export const searchRoutes = new Elysia({ prefix: "/search", tags: ["Search"] })

  /**
   * GET /search
   *
   * Unified search endpoint.
   *
   * - Media: hits TMDB for full coverage + pagination, enriches with local DB data
   *   (resolved image URLs, slug, localId). Non-local items are imported lazily
   *   on first visit via /media/slug/:slug.
   * - Users + Lists: local DB only (platform-specific data).
   *
   * ?q       - search query (required, min 1 char after trim)
   * ?type    - "all" | "movie" | "series" | "users" | "lists"  (default: "all")
   * ?page    - page number for media results (default: 1)
   * ?limit   - results per page for media (default: 20, max: 50)
   */
  .get(
    "/",
    async (ctx: any) => {
      const { query: params, set, request } = ctx;
      const q = params.q?.trim();

      if (!q) {
        return { media: [], users: [], lists: [], page: 1, totalPages: 0, total: 0, hasNext: false, hasPrev: false };
      }

      const type = (params.type ?? "all") as "all" | "movie" | "series" | "users" | "lists";
      const page  = Math.max(1, Number(params.page) || 1);
      const limit = Math.min(Number(params.limit) || 20, 50);

      const wantsMedia = type === "all" || type === "movie" || type === "series";
      const wantsUsers = type === "all" || type === "users";
      const wantsLists = type === "all" || type === "lists";

      const session = wantsUsers ? await getOptionalSession(request.headers) : null;
      const authUser = session?.user ?? null;

      try {
        const [mediaResult, users, lists] = await Promise.all([
          wantsMedia ? fetchMedia(q, type === "movie" || type === "series" ? type : "all", page) : null,
          wantsUsers ? fetchUsers(q, authUser?.id) : Promise.resolve([]),
          wantsLists ? fetchLists(q) : Promise.resolve([]),
        ]);

        return {
          media:      mediaResult?.results  ?? [],
          users,
          lists,
          page:       mediaResult?.page       ?? 1,
          totalPages: mediaResult?.totalPages ?? 0,
          total:      mediaResult?.total      ?? 0,
          hasNext:    mediaResult?.hasNext    ?? false,
          hasPrev:    mediaResult?.hasPrev    ?? false,
        };
      } catch (error) {
        logger.error({ error, q }, "Search failed");
        set.status = 500;
        return { error: "Search failed" };
      }
    },
    {
      query: t.Object({
        q:     t.Optional(t.String()),
        type:  t.Optional(t.String()),
        page:  t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  );

// ─── Media ────────────────────────────────────────────────────────────────────

async function fetchMedia(q: string, type: "all" | "movie" | "series", page: number) {
  // 1. Search TMDB — provides full catalog + pagination
  const tmdbResult = await metadataService.search(q, { type, page, language: "en-US" });

  if (tmdbResult.results.length === 0) {
    return { results: [], page: tmdbResult.page, totalPages: tmdbResult.totalPages, total: tmdbResult.totalResults, hasNext: false, hasPrev: false };
  }

  // 2. Check local DB for all returned TMDB IDs in one query
  const tmdbIds = tmdbResult.results.map((r) => r.tmdbId);
  const localRows = await db
    .select({ id: media.id, tmdbId: media.tmdbId, slug: media.slug, posterPath: media.posterPath, backdropPath: media.backdropPath })
    .from(media)
    .where(inArray(media.tmdbId, tmdbIds));

  const localMap = new Map(localRows.map((m) => [m.tmdbId, m]));

  // 3. Merge: prefer local image URLs (already on our storage), fall back to TMDB CDN
  const results = tmdbResult.results.map((r) => {
    const local = localMap.get(r.tmdbId);
    return {
      id:            r.tmdbId,
      tmdbId:        r.tmdbId,
      mediaType:     r.mediaType,
      title:         r.title,
      originalTitle: r.originalTitle,
      overview:      r.overview,
      releaseDate:   r.releaseDate,
      voteAverage:   r.voteAverage,
      posterPath:    local?.posterPath ? resolveImageUrl(local.posterPath) : r.posterPath,
      backdropPath:  local?.backdropPath ? resolveImageUrl(local.backdropPath) : r.backdropPath,
      isLocal:       !!local,
      localId:       local?.id,
      localSlug:     local?.slug,
    };
  });

  return {
    results,
    page:       tmdbResult.page,
    totalPages: tmdbResult.totalPages,
    total:      tmdbResult.totalResults,
    hasNext:    tmdbResult.page < tmdbResult.totalPages,
    hasPrev:    tmdbResult.page > 1,
  };
}

// ─── Users ────────────────────────────────────────────────────────────────────

async function fetchUsers(q: string, viewerId?: string) {
  const conditions: ReturnType<typeof eq>[] = [
    or(ilike(user.username, `%${q}%`), ilike(user.displayName, `%${q}%`)) as any,
  ];
  if (viewerId) {
    conditions.push(notInArray(user.id, blockedUserIds(viewerId)) as any);
  }
  return db
    .select({ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, isVerified: user.isVerified })
    .from(user)
    .where(and(...conditions))
    .orderBy(desc(user.createdAt))
    .limit(5);
}

// ─── Lists ────────────────────────────────────────────────────────────────────

async function fetchLists(q: string) {
  return db
    .select({ id: lists.id, name: lists.name, description: lists.description, itemsCount: lists.itemsCount, userId: lists.userId })
    .from(lists)
    .where(and(ilike(lists.name, `%${q}%`), eq(lists.isPublic, true)))
    .orderBy(desc(lists.likesCount))
    .limit(5);
}
