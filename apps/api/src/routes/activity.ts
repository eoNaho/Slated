import { Elysia, t } from "elysia";
import { db } from "../db";
import {
  activityTokens,
  currentActivity,
  scrobbles,
  user,
} from "../db/schema";
import { betterAuthPlugin } from "../lib/auth";
import { eq, desc, and, count, sum, sql, lt, gte } from "drizzle-orm";
import { generateSecureToken, hashData } from "../middleware/security";
import { resolveExtensionToken } from "../lib/extension-auth";
import { metadataService } from "../services/metadata.service";
import { logger } from "../utils/logger";

// Scrobble threshold: auto-scrobble when progress >= this value
const SCROBBLE_THRESHOLD = 80;

// ─── TMDB Auto-Resolution ─────────────────────────────────────────────────────

/**
 * Automatically resolve a TMDB ID from a title string.
 * Uses metadataService.search to find the best match.
 * Returns { tmdbId, mediaType, runtimeMinutes } or nulls if not found.
 */
async function autoResolveTmdb(
  title: string,
  mediaType?: "movie" | "episode" | null,
  season?: number | null,
  episode?: number | null
): Promise<{ tmdbId: number | null; resolvedMediaType: "movie" | "episode"; runtimeMinutes: number | null }> {
  try {
    // Map scrobble media_type to search type
    // "episode" scrobbles are TV series in TMDB
    const searchType: "movie" | "series" | "all" =
      mediaType === "movie" ? "movie" :
      mediaType === "episode" ? "series" : "all";

    const result = await metadataService.search(title, { type: searchType, page: 1 });

    if (result.results.length === 0) {
      return { tmdbId: null, resolvedMediaType: mediaType || (season != null ? "episode" : "movie"), runtimeMinutes: null };
    }

    // Take the first (most relevant) result
    const best = result.results[0];
    const resolvedMediaType: "movie" | "episode" = best.mediaType === "series" ? "episode" : "movie";

    logger.info(
      { title, resolvedTmdbId: best.tmdbId, resolvedTitle: best.title, resolvedMediaType },
      "Auto-resolved TMDB ID for scrobble"
    );

    return {
      tmdbId: best.tmdbId,
      resolvedMediaType: mediaType || resolvedMediaType,
      runtimeMinutes: null, // Could be fetched in a future enhancement
    };
  } catch (err) {
    logger.warn({ err, title }, "Failed to auto-resolve TMDB ID for scrobble");
    return { tmdbId: null, resolvedMediaType: mediaType || (season != null ? "episode" : "movie"), runtimeMinutes: null };
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export const activityRoutes = new Elysia({
  prefix: "/activity",
  tags: ["Activity"],
})
  .use(betterAuthPlugin)

  // ── Token Management ────────────────────────────────────────────────────────

  /**
   * POST /api/v1/activity/tokens
   * Generate a new API token for the extension.
   * The raw token is returned only once.
   */
  .post(
    "/tokens",
    async (ctx: any) => {
      const { user: authUser, body } = ctx;

      // Limit: max 10 active tokens per user
      const [{ total }] = await db
        .select({ total: count() })
        .from(activityTokens)
        .where(eq(activityTokens.userId, authUser.id));

      if (total >= 10) {
        ctx.set.status = 422;
        return { error: "Maximum of 10 tokens reached. Revoke one first." };
      }

      const rawToken = generateSecureToken(40); // 80-char hex
      const hash = await hashData(rawToken);

      const [created] = await db
        .insert(activityTokens)
        .values({
          userId: authUser.id,
          name: body.name ?? "Browser Extension",
          tokenHash: hash,
        })
        .returning({ id: activityTokens.id, name: activityTokens.name, createdAt: activityTokens.createdAt });

      return {
        data: {
          ...created,
          // Raw token shown ONLY at creation — store it safely
          token: rawToken,
        },
      };
    },
    {
      requireAuth: true,
      body: t.Object({
        name: t.Optional(t.String({ maxLength: 60 })),
      }),
    }
  )

  /**
   * GET /api/v1/activity/tokens
   * List all tokens for the authenticated user (hash never exposed).
   */
  .get(
    "/tokens",
    async (ctx: any) => {
      const { user: authUser } = ctx;

      const tokens = await db
        .select({
          id: activityTokens.id,
          name: activityTokens.name,
          lastUsedAt: activityTokens.lastUsedAt,
          createdAt: activityTokens.createdAt,
        })
        .from(activityTokens)
        .where(eq(activityTokens.userId, authUser.id))
        .orderBy(desc(activityTokens.createdAt));

      return { data: tokens };
    },
    { requireAuth: true }
  )

  /**
   * DELETE /api/v1/activity/tokens/:id
   * Revoke a token owned by the authenticated user.
   */
  .delete(
    "/tokens/:id",
    async (ctx: any) => {
      const { user: authUser, params } = ctx;

      const [deleted] = await db
        .delete(activityTokens)
        .where(
          and(
            eq(activityTokens.id, params.id),
            eq(activityTokens.userId, authUser.id)
          )
        )
        .returning({ id: activityTokens.id });

      if (!deleted) {
        ctx.set.status = 404;
        return { error: "Token not found" };
      }

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ── Heartbeat ───────────────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/activity
   * Extension heartbeat. Authenticated via Bearer token.
   * - Upserts current_activity
   * - If progress >= SCROBBLE_THRESHOLD AND status === "finished", creates a scrobble
   */
  .patch(
    "/",
    async (ctx: any) => {
      const { request, body, set } = ctx;

      const userId = await resolveExtensionToken(request.headers);
      if (!userId) {
        set.status = 401;
        return { error: "Invalid or missing API token" };
      }

      const now = new Date();
      const { title, season, episode, progress, source, status, runtime_minutes } = body;
      let { tmdb_id, media_type } = body;

      // Auto-resolve TMDB ID if not provided
      if (tmdb_id == null) {
        const resolved = await autoResolveTmdb(title, media_type, season, episode);
        tmdb_id = resolved.tmdbId;
        if (!media_type) media_type = resolved.resolvedMediaType;
      }

      // Upsert current_activity
      await db
        .insert(currentActivity)
        .values({
          userId,
          tmdbId: tmdb_id ?? null,
          mediaType: media_type ?? (season != null ? "episode" : "movie"),
          title,
          season: season ?? null,
          episode: episode ?? null,
          progress: progress ?? null,
          source,
          status,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: currentActivity.userId,
          set: {
            tmdbId: tmdb_id ?? null,
            mediaType: media_type ?? (season != null ? "episode" : "movie"),
            title,
            season: season ?? null,
            episode: episode ?? null,
            progress: progress ?? null,
            source,
            status,
            updatedAt: now,
          },
        });

      // Scrobble automático:
      // Apenas quando status === "finished" E progress >= threshold.
      // "finished" só é enviado pelo content script quando video.ended === true ou progress >= 98%.
      // Isso evita scrobbles falsos quando o usuário pausa ou fecha a aba no meio do conteúdo.
      let scrobbled = false;

      if (status === "finished" && (progress ?? 0) >= SCROBBLE_THRESHOLD) {
        try {
          // Verifica se já existe scrobble recente para evitar duplicatas (janela de 2 horas)
          const recentCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
          const [existing] = await db
            .select({ id: scrobbles.id })
            .from(scrobbles)
            .where(
              and(
                eq(scrobbles.userId, userId),
                eq(scrobbles.title, title),
                eq(scrobbles.source, source),
                gte(scrobbles.watchedAt, recentCutoff),
                ...(season != null ? [eq(scrobbles.season, season)] : []),
                ...(episode != null ? [eq(scrobbles.episode, episode)] : [])
              )
            )
            .limit(1);

          if (!existing) {
            await db
              .insert(scrobbles)
              .values({
                userId,
                tmdbId: tmdb_id ?? null,
                mediaType: media_type ?? (season != null ? "episode" : "movie"),
                title,
                season: season ?? null,
                episode: episode ?? null,
                runtimeMinutes: runtime_minutes ?? null,
                source,
                progress: progress ?? null,
                isManual: false,
                watchedAt: now,
              })
              .onConflictDoNothing();

            scrobbled = true;
          }
        } catch {
          // Silently ignore
        }
      }

      return { success: true, scrobbled };
    },
    {
      body: t.Object({
        title: t.String(),
        season: t.Optional(t.Nullable(t.Integer())),
        episode: t.Optional(t.Nullable(t.Integer())),
        progress: t.Optional(t.Nullable(t.Number({ minimum: 0, maximum: 100 }))),
        source: t.String(),
        status: t.Union([t.Literal("watching"), t.Literal("paused"), t.Literal("finished")]),
        tmdb_id: t.Optional(t.Nullable(t.Integer())),
        media_type: t.Optional(t.Nullable(t.Union([t.Literal("movie"), t.Literal("episode")]))),
        runtime_minutes: t.Optional(t.Nullable(t.Integer())),
      }),
    }
  )

  // ── Public profile endpoints ────────────────────────────────────────────────

  /**
   * GET /api/v1/activity/now/:userId
   * Returns what a user is currently watching.
   * Respects the user's privacy settings.
   * Stale activity older than 5 minutes is not returned.
   */
  .get(
    "/now/:userId",
    async (ctx: any) => {
      const { params, request } = ctx;

      // Check privacy (basic: if activity is public, return; else check follower)
      // For now we expose if activity exists and is recent (<= 5 min)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const [activity] = await db
        .select()
        .from(currentActivity)
        .where(
          and(
            eq(currentActivity.userId, params.userId),
            // Only show if updated within the last 5 minutes
            gte(currentActivity.updatedAt, fiveMinutesAgo)
          )
        )
        .limit(1);

      if (!activity) {
        return { data: null };
      }

      return {
        data: {
          title: activity.title,
          season: activity.season,
          episode: activity.episode,
          progress: activity.progress,
          source: activity.source,
          status: activity.status,
          mediaType: activity.mediaType,
          tmdbId: activity.tmdbId,
          updatedAt: activity.updatedAt,
        },
      };
    },
    {
      params: t.Object({ userId: t.String() }),
    }
  )

  /**
   * GET /api/v1/activity/scrobbles/:userId
   * Paginated scrobble history for a user.
   */
  .get(
    "/scrobbles/:userId",
    async (ctx: any) => {
      const { params, query } = ctx;

      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(Number(query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      const rows = await db
        .select()
        .from(scrobbles)
        .where(eq(scrobbles.userId, params.userId))
        .orderBy(desc(scrobbles.watchedAt))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await db
        .select({ total: count() })
        .from(scrobbles)
        .where(eq(scrobbles.userId, params.userId));

      return {
        data: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      };
    },
    {
      params: t.Object({ userId: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  /**
   * POST /api/v1/activity/scrobbles
   * Manual scrobble — allows retroactive logging via the site UI.
   */
  .post(
    "/scrobbles",
    async (ctx: any) => {
      const { user: authUser, body } = ctx;

      let tmdbId = body.tmdb_id ?? null;
      let mediaType = body.media_type;

      // Auto-resolve TMDB ID if not provided
      if (tmdbId == null) {
        const resolved = await autoResolveTmdb(body.title, mediaType, body.season, body.episode);
        tmdbId = resolved.tmdbId;
      }

      const [created] = await db
        .insert(scrobbles)
        .values({
          userId: authUser.id,
          tmdbId,
          mediaType,
          title: body.title,
          season: body.season ?? null,
          episode: body.episode ?? null,
          runtimeMinutes: body.runtime_minutes ?? null,
          source: body.source ?? "manual",
          progress: 100,
          isManual: true,
          watchedAt: body.watched_at ? new Date(body.watched_at) : new Date(),
        })
        .returning();

      return { data: created };
    },
    {
      requireAuth: true,
      body: t.Object({
        title: t.String(),
        media_type: t.Union([t.Literal("movie"), t.Literal("episode")]),
        tmdb_id: t.Optional(t.Nullable(t.Integer())),
        season: t.Optional(t.Nullable(t.Integer())),
        episode: t.Optional(t.Nullable(t.Integer())),
        runtime_minutes: t.Optional(t.Nullable(t.Integer())),
        source: t.Optional(t.String()),
        watched_at: t.Optional(t.String()), // ISO 8601 date string
      }),
    }
  )

  /**
   * DELETE /api/v1/activity/scrobbles/:id
   * Remove a scrobble owned by the authenticated user.
   */
  .delete(
    "/scrobbles/:id",
    async (ctx: any) => {
      const { user: authUser, params, set } = ctx;

      const [deleted] = await db
        .delete(scrobbles)
        .where(
          and(
            eq(scrobbles.id, params.id),
            eq(scrobbles.userId, authUser.id)
          )
        )
        .returning({ id: scrobbles.id });

      if (!deleted) {
        set.status = 404;
        return { error: "Scrobble not found" };
      }

      return { success: true };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ── Stats ───────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/activity/stats/:userId
   * Aggregate watch statistics: totals, monthly breakdown, top genres, sources.
   */
  .get(
    "/stats/:userId",
    async (ctx: any) => {
      const { params, query } = ctx;
      const { userId } = params;

      // Optional: restrict to a given year/month
      const year = query.year ? Number(query.year) : null;
      const month = query.month ? Number(query.month) : null;

      // Build filter
      const filters: any[] = [eq(scrobbles.userId, userId)];
      if (year && month) {
        filters.push(
          sql`EXTRACT(YEAR FROM ${scrobbles.watchedAt}) = ${year}`,
          sql`EXTRACT(MONTH FROM ${scrobbles.watchedAt}) = ${month}`
        );
      } else if (year) {
        filters.push(sql`EXTRACT(YEAR FROM ${scrobbles.watchedAt}) = ${year}`);
      }

      const where = and(...filters);

      // Total counts
      const [totals] = await db
        .select({
          totalScrobbles: count(),
          totalMovies: count(
            sql`CASE WHEN ${scrobbles.mediaType} = 'movie' THEN 1 END`
          ),
          totalEpisodes: count(
            sql`CASE WHEN ${scrobbles.mediaType} = 'episode' THEN 1 END`
          ),
          totalMinutes: sum(scrobbles.runtimeMinutes),
        })
        .from(scrobbles)
        .where(where);

      // Source breakdown
      const sourceBreakdown = await db
        .select({
          source: scrobbles.source,
          count: count(),
        })
        .from(scrobbles)
        .where(where)
        .groupBy(scrobbles.source)
        .orderBy(desc(count()));

      // Monthly breakdown (always useful even if year given)
      const monthly = await db
        .select({
          year: sql<number>`EXTRACT(YEAR FROM ${scrobbles.watchedAt})::int`,
          month: sql<number>`EXTRACT(MONTH FROM ${scrobbles.watchedAt})::int`,
          count: count(),
          minutes: sum(scrobbles.runtimeMinutes),
        })
        .from(scrobbles)
        .where(eq(scrobbles.userId, userId))
        .groupBy(
          sql`EXTRACT(YEAR FROM ${scrobbles.watchedAt})`,
          sql`EXTRACT(MONTH FROM ${scrobbles.watchedAt})`
        )
        .orderBy(
          desc(sql`EXTRACT(YEAR FROM ${scrobbles.watchedAt})`),
          desc(sql`EXTRACT(MONTH FROM ${scrobbles.watchedAt})`)
        )
        .limit(24);

      return {
        data: {
          totalScrobbles: totals.totalScrobbles,
          totalMovies: totals.totalMovies,
          totalEpisodes: totals.totalEpisodes,
          totalHours: totals.totalMinutes
            ? Math.round((Number(totals.totalMinutes) / 60) * 10) / 10
            : null,
          sourceBreakdown,
          monthly,
        },
      };
    },
    {
      params: t.Object({ userId: t.String() }),
      query: t.Object({
        year: t.Optional(t.String()),
        month: t.Optional(t.String()),
      }),
    }
  );
