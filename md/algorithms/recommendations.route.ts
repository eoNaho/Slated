/**
 * routes/recommendations.ts
 *
 * Endpoints de recomendação — disponíveis para todos,
 * mas com maior profundidade para usuários premium.
 *
 *   GET /recommendations/media          → filmes/séries sugeridos
 *   GET /recommendations/users          → usuários para seguir
 *   GET /recommendations/feed           → feed inteligente rankeado
 *   POST /recommendations/seed          → invalida cache ao assistir algo
 */

import { Elysia, t } from "elysia";
import { betterAuthPlugin } from "../lib/auth";
import {
  mediaRecService,
  userRecService,
  feedService,
  tasteProfileService,
} from "../services/recommendation.service";
import { storageService } from "../services/storage";

function resolveImageUrl(path: string | null): string | null {
  if (!path) return null;
  return storageService.getImageUrl(path);
}

export const recommendationsRoutes = new Elysia({
  prefix: "/recommendations",
  tags: ["Recommendations"],
}).use(betterAuthPlugin)

  // ── GET /recommendations/media ─────────────────────────────────────────────

  /**
   * Recomendações de filmes/séries personalizadas.
   * Premium: até 50 resultados + breakdown das fontes
   * Free:    até 10 resultados
   */
  .get(
    "/media",
    async (ctx: any) => {
      const { user, query } = ctx;
      const isPremium = user.isPremium ?? false;

      const maxLimit = isPremium ? 50 : 10;
      const limit    = Math.min(Number(query.limit) || 20, maxLimit);
      const type     = (query.type ?? "all") as "movie" | "series" | "all";

      const recs = await mediaRecService.getRecommendations(user.id, {
        limit,
        type,
        excludeWatched: query.exclude_watched !== "false",
      });

      return {
        data: recs.map((r) => ({
          ...r,
          posterPath: resolveImageUrl(r.posterPath),
          // Só expõe o score para premium (para o "PixelReel acha X% de chance de você gostar")
          score:    isPremium ? Math.round(r.score * 10) / 10 : undefined,
          matchPct: isPremium ? Math.min(99, Math.round(r.score * 8)) : undefined,
        })),
        meta: {
          isPremium,
          limit,
          type,
        },
      };
    },
    {
      requireAuth: true,
      query: t.Object({
        limit:           t.Optional(t.String()),
        type:            t.Optional(t.Union([t.Literal("movie"), t.Literal("series"), t.Literal("all")])),
        exclude_watched: t.Optional(t.String()),
      }),
    }
  )

  // ── GET /recommendations/users ─────────────────────────────────────────────

  /**
   * Usuários recomendados para seguir.
   * Baseado em taste similarity + social proximity + activity overlap.
   */
  .get(
    "/users",
    async (ctx: any) => {
      const { user, query } = ctx;
      const isPremium = user.isPremium ?? false;

      const maxLimit = isPremium ? 30 : 10;
      const limit    = Math.min(Number(query.limit) || 10, maxLimit);

      const recs = await userRecService.getRecommendations(user.id, limit);

      return {
        data: recs.map((r) => ({
          ...r,
          avatarUrl: resolveImageUrl(r.avatarUrl),
          tasteSimilarity: isPremium ? Math.round(r.tasteSimilarity * 100) : undefined,
          commonMedia:     isPremium ? r.commonMedia : undefined,
        })),
      };
    },
    {
      requireAuth: true,
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ── GET /recommendations/feed ──────────────────────────────────────────────

  /**
   * Feed inteligente rankeado.
   * Combina atividades dos seguidos + sugestões de usuários.
   */
  .get(
    "/feed",
    async (ctx: any) => {
      const { user, query } = ctx;
      const page  = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(Number(query.limit) || 20, 50);

      const result = await feedService.getRankedFeed(user.id, { page, limit });

      return {
        data: result.items.map((item) => ({
          ...item,
          avatarUrl: resolveImageUrl(item.avatarUrl),
          score:     user.isPremium ? item.score : undefined,
        })),
        suggestedUsers: result.suggestedUsers.map((u) => ({
          ...u,
          avatarUrl: resolveImageUrl(u.avatarUrl),
        })),
        pagination: {
          page,
          limit,
          hasMore: result.hasMore,
        },
      };
    },
    {
      requireAuth: true,
      query: t.Object({
        page:  t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // ── GET /recommendations/taste-profile ────────────────────────────────────

  /**
   * Retorna o perfil de gosto do usuário (premium only).
   * Usado na tela de analytics/stats.
   */
  .get(
    "/taste-profile",
    async (ctx: any) => {
      const { user, set } = ctx;

      if (!user.isPremium) {
        set.status = 403;
        return { error: "Taste profile analytics requires a premium subscription" };
      }

      const profile = await tasteProfileService.buildProfile(user.id);

      return {
        data: {
          topGenres:     profile.topGenres.slice(0, 10),
          topDecades:    profile.topDecades,
          topLanguages:  profile.topLanguages,
          avgRating:     Math.round(profile.avgRating * 10) / 10,
          ratingStdDev:  Math.round(profile.ratingStdDev * 100) / 100,
          totalWatched:  profile.totalWatched,
          reviewRate:    Math.round(profile.reviewRate * 100),
          activityLevel: profile.activityLevel,
          computedAt:    profile.computedAt,
        },
      };
    },
    { requireAuth: true }
  )

  // ── POST /recommendations/seed ─────────────────────────────────────────────

  /**
   * Invalida o cache de recomendações após o usuário assistir algo.
   * Chamado internamente pelo diary/scrobble routes.
   */
  .post(
    "/seed",
    async (ctx: any) => {
      const { user } = ctx;
      await tasteProfileService.invalidate(user.id);
      return { success: true };
    },
    { requireAuth: true }
  );
