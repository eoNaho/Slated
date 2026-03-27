/**
 * PixelReel — Recommendation Engine
 *
 * Algoritmo híbrido em 3 camadas:
 *   1. Content-Based Filtering  → "você gostou de X, X tem gênero Y e diretor Z"
 *   2. Collaborative Filtering  → "usuários parecidos com você também assistiram..."
 *   3. Social Graph Signals     → "pessoas que você segue estão assistindo..."
 *
 * Para recomendação de USUÁRIOS (seguir):
 *   1. Taste Similarity Score   → vetores de gênero/época/avaliação
 *   2. Social Distance          → amigos de amigos (grafo BFS nível 2)
 *   3. Activity Overlap         → assistiram os mesmos filmes
 *   4. Engagement Score         → quão ativo/qualitativo é o usuário
 */

import {
  db,
  media,
  genres,
  mediaGenres,
  diary,
  ratings,
  reviews,
  follows,
  activities,
  user as userTable,
  userStats,
  eq,
  and,
  or,
  desc,
  asc,
  inArray,
  notInArray,
  count,
  sql,
  gte,
  lt,
} from "../db";
import { scrobbles } from "../db/schema/activity";
import { cache } from "../lib/cache";
import { logger } from "../utils/logger";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CACHE_TTL = {
  TASTE_PROFILE:    30 * 60,      // 30 min — recalcula quando usuário assiste algo
  MEDIA_RECS:       60 * 60,      // 1 hora
  USER_RECS:        2 * 60 * 60,  // 2 horas
  FEED_SCORE:       5 * 60,       // 5 min — feed muda rápido
};

const WEIGHTS = {
  // Pesos para score de mídia
  GENRE_MATCH:        3.0,
  DIRECTOR_MATCH:     4.0,
  ACTOR_MATCH:        1.5,
  DECADE_MATCH:       2.0,
  LANGUAGE_MATCH:     1.0,
  RATING_PROXIMITY:   2.0,  // quão perto do rating médio do usuário
  POPULARITY_BOOST:   0.5,  // evita total obscuridade
  RECENCY_WEIGHT:     1.5,  // preferência por lançamentos recentes

  // Pesos para score de usuário
  TASTE_SIMILARITY:   5.0,
  SOCIAL_PROXIMITY:   3.0,  // amigo de amigo
  ACTIVITY_OVERLAP:   4.0,  // assistiram os mesmos filmes
  ENGAGEMENT_SCORE:   2.0,  // reviews, listas, atividade
  MUTUAL_FOLLOWS:     2.5,  // usuários que já te seguem

  // Decay temporal (feed)
  HALF_LIFE_HOURS:    48,
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TasteProfile {
  userId: string;
  topGenres: Array<{ genreId: string; genreName: string; score: number }>;
  topDecades: Array<{ decade: number; score: number }>;
  topLanguages: Array<{ language: string; score: number }>;
  avgRating: number;
  ratingStdDev: number;         // variância — usuários com alta std são mais "críticos"
  watchedMediaIds: Set<string>; // para filtrar o que já viu
  genreVector: number[];        // vetor normalizado para cosine similarity
  totalWatched: number;
  reviewRate: number;           // reviews / filmes assistidos (0–1)
  activityLevel: "low" | "medium" | "high";
  computedAt: Date;
}

export interface MediaRecommendation {
  mediaId: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: "movie" | "series";
  releaseDate: string | null;
  voteAverage: number;
  score: number;          // score interno do algoritmo
  reasons: string[];      // ["Porque você gostou de Oppenheimer", "Gênero: Drama"]
  source: "content" | "collaborative" | "social" | "trending";
}

export interface UserRecommendation {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  tasteSimilarity: number;   // 0–1 (cosine similarity dos vetores de gênero)
  commonMedia: number;       // filmes em comum
  mutualFollows: number;
  reasons: string[];
  isFollowingBack: boolean;  // já te segue
}

export interface FeedItem {
  activityId: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  type: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, any>;
  score: number;
  createdAt: Date;
}

// ─── Helpers matemáticos ──────────────────────────────────────────────────────

/**
 * Cosine Similarity entre dois vetores numéricos.
 * Retorna 0–1 (1 = idêntico, 0 = sem correlação).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Time-decay score (Half-Life).
 * Item de agora = 1.0, item de HALF_LIFE_HOURS atrás = 0.5.
 */
function timeDecay(createdAt: Date, halfLifeHours = WEIGHTS.HALF_LIFE_HOURS): number {
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return Math.pow(0.5, ageHours / halfLifeHours);
}

/**
 * Wilson Score — ranking robusto para likes/votos.
 * Evita que 1 like de 1 visualização rankeje acima de 50 likes de 60.
 */
function wilsonScore(positive: number, total: number): number {
  if (total === 0) return 0;
  const z = 1.96;
  const p = positive / total;
  return (
    (p + (z * z) / (2 * total) -
      z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) /
    (1 + (z * z) / total)
  );
}

/**
 * Normaliza um vetor para magnitude 1 (para cosine similarity).
 */
function normalizeVector(v: number[]): number[] {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (mag === 0) return v.map(() => 0);
  return v.map((x) => x / mag);
}

// ─── Perfil de Gosto ──────────────────────────────────────────────────────────

export class TasteProfileService {
  /**
   * Constrói (ou retorna do cache) o perfil de gosto de um usuário.
   *
   * Leva em conta:
   * - Diário (assistiu + rating)
   * - Scrobbles recentes (peso maior — são mais recentes e intencionais)
   * - Ratings avulsos
   *
   * Cada entrada contribui com um score ponderado por:
   *   recencyWeight × ratingWeight
   */
  async buildProfile(userId: string, forceRefresh = false): Promise<TasteProfile> {
    const cacheKey = `taste:profile:${userId}`;

    if (!forceRefresh) {
      const cached = await cache.get<TasteProfile>(cacheKey);
      if (cached) return cached;
    }

    // ── 1. Buscar histórico de assistidos ─────────────────────────────────

    // Diário: cada entrada tem data e rating opcional
    const diaryEntries = await db
      .select({
        mediaId: diary.mediaId,
        rating:  diary.rating,
        watchedAt: diary.watchedAt, // string YYYY-MM-DD
      })
      .from(diary)
      .where(eq(diary.userId, userId))
      .orderBy(desc(diary.watchedAt))
      .limit(500); // últimos 500

    // Ratings avulsos (sem entrada no diário)
    const ratingEntries = await db
      .select({
        mediaId: ratings.mediaId,
        rating:  ratings.rating,
        updatedAt: ratings.updatedAt,
      })
      .from(ratings)
      .where(eq(ratings.userId, userId))
      .limit(500);

    // ── 2. Montar mapa de mediaId → { rating, recencyWeight } ─────────────

    const mediaScoreMap = new Map<string, { rating: number; recency: number }>();

    for (const entry of diaryEntries) {
      const ageMonths = (Date.now() - new Date(entry.watchedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
      const recency = 1 / (1 + ageMonths / 6); // 6 meses = peso 0.5
      const rating = entry.rating ?? 3.0;       // sem rating → neutro
      mediaScoreMap.set(entry.mediaId, { rating, recency });
    }

    // Ratings avulsos complementam (não sobrescrevem)
    for (const entry of ratingEntries) {
      if (!mediaScoreMap.has(entry.mediaId)) {
        const ageMonths = (Date.now() - new Date(entry.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
        const recency = 1 / (1 + ageMonths / 6);
        mediaScoreMap.set(entry.mediaId, { rating: entry.rating, recency });
      }
    }

    const watchedIds = [...mediaScoreMap.keys()];

    // ── 3. Buscar gêneros de tudo que assistiu ────────────────────────────

    let genreAccumulator = new Map<string, { name: string; score: number }>();
    let decadeAccumulator = new Map<number, number>();
    let languageAccumulator = new Map<string, number>();
    let ratingSum = 0;
    let ratingCount = 0;
    const ratingValues: number[] = [];

    if (watchedIds.length > 0) {
      const mediaDetails = await db
        .select({
          id:               media.id,
          releaseDate:      media.releaseDate,
          originalLanguage: media.originalLanguage,
        })
        .from(media)
        .where(inArray(media.id, watchedIds));

      const genreRows = await db
        .select({
          mediaId:   mediaGenres.mediaId,
          genreId:   genres.id,
          genreName: genres.name,
        })
        .from(mediaGenres)
        .innerJoin(genres, eq(mediaGenres.genreId, genres.id))
        .where(inArray(mediaGenres.mediaId, watchedIds));

      // Mapeia mediaId → gêneros
      const genresByMedia = new Map<string, Array<{ id: string; name: string }>>();
      for (const row of genreRows) {
        if (!genresByMedia.has(row.mediaId)) genresByMedia.set(row.mediaId, []);
        genresByMedia.get(row.mediaId)!.push({ id: row.genreId, name: row.genreName });
      }

      for (const m of mediaDetails) {
        const entry = mediaScoreMap.get(m.id);
        if (!entry) continue;

        const { rating, recency } = entry;
        // Contribuição = (rating - 2.5) × recency
        // Filmes com rating > 2.5 contribuem positivamente para o gênero
        const contribution = (rating - 2.5) * recency;

        // Gêneros
        for (const g of genresByMedia.get(m.id) ?? []) {
          const current = genreAccumulator.get(g.id) ?? { name: g.name, score: 0 };
          genreAccumulator.set(g.id, { name: g.name, score: current.score + contribution });
        }

        // Década
        if (m.releaseDate) {
          const year = new Date(m.releaseDate).getFullYear();
          const decade = Math.floor(year / 10) * 10;
          decadeAccumulator.set(decade, (decadeAccumulator.get(decade) ?? 0) + recency);
        }

        // Idioma
        if (m.originalLanguage) {
          languageAccumulator.set(
            m.originalLanguage,
            (languageAccumulator.get(m.originalLanguage) ?? 0) + recency
          );
        }

        // Rating stats
        if (entry.rating) {
          ratingSum += entry.rating;
          ratingCount++;
          ratingValues.push(entry.rating);
        }
      }
    }

    // ── 4. Calcular estatísticas de rating ────────────────────────────────

    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 3.0;
    const ratingStdDev = ratingValues.length > 1
      ? Math.sqrt(
          ratingValues.reduce((s, r) => s + Math.pow(r - avgRating, 2), 0) / ratingValues.length
        )
      : 0;

    // ── 5. Construir vetores ordenados ────────────────────────────────────

    const topGenres = [...genreAccumulator.entries()]
      .map(([genreId, { name, score }]) => ({ genreId, genreName: name, score }))
      .filter((g) => g.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const topDecades = [...decadeAccumulator.entries()]
      .map(([decade, score]) => ({ decade, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const topLanguages = [...languageAccumulator.entries()]
      .map(([language, score]) => ({ language, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Vetor de gênero para cosine similarity (tamanho fixo com os top 50 gêneros globais)
    // Em produção, buscar os top 50 gêneros globais da DB
    const TOP_GENRE_IDS = topGenres.map((g) => g.genreId); // simplificado
    const genreVector = normalizeVector(
      TOP_GENRE_IDS.map((id) => {
        const g = genreAccumulator.get(id);
        return g ? Math.max(0, g.score) : 0;
      })
    );

    // Level de atividade
    const reviewCount = await db
      .select({ n: count() })
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .then((r) => Number(r[0].n));

    const reviewRate = watchedIds.length > 0 ? reviewCount / watchedIds.length : 0;
    const activityLevel =
      watchedIds.length >= 100 ? "high" : watchedIds.length >= 20 ? "medium" : "low";

    // ── 6. Montar perfil final ─────────────────────────────────────────────

    const profile: TasteProfile = {
      userId,
      topGenres,
      topDecades,
      topLanguages,
      avgRating,
      ratingStdDev,
      watchedMediaIds: new Set(watchedIds),
      genreVector,
      totalWatched: watchedIds.length,
      reviewRate,
      activityLevel,
      computedAt: new Date(),
    };

    await cache.set(cacheKey, { ...profile, watchedMediaIds: watchedIds }, CACHE_TTL.TASTE_PROFILE);

    return profile;
  }

  /** Invalida o cache do perfil (chamar após novo scrobble/diary entry). */
  async invalidate(userId: string) {
    // Redis não tem del direto no wrapper, mas podemos forçar refresh
    await cache.set(`taste:profile:${userId}`, null, 1);
  }
}

export const tasteProfileService = new TasteProfileService();

// ─── Recomendação de Mídia ────────────────────────────────────────────────────

export class MediaRecommendationService {
  /**
   * Retorna até `limit` recomendações de mídia para o usuário.
   *
   * Pipeline:
   *   1. Content-Based: filmes similares ao perfil de gosto
   *   2. Collaborative: filmes que usuários similares assistiram
   *   3. Social: filmes que quem o usuário segue está assistindo
   *   4. Merge, de-duplicate e re-rank pelo score combinado
   */
  async getRecommendations(
    userId: string,
    options: {
      limit?: number;
      type?: "movie" | "series" | "all";
      excludeWatched?: boolean;
    } = {}
  ): Promise<MediaRecommendation[]> {
    const { limit = 20, type = "all", excludeWatched = true } = options;
    const cacheKey = `media:recs:${userId}:${type}:${limit}`;

    const cached = await cache.get<MediaRecommendation[]>(cacheKey);
    if (cached) return cached;

    const profile = await tasteProfileService.buildProfile(userId);
    const toExclude = excludeWatched ? [...profile.watchedMediaIds] : [];

    // Rodar as 3 fontes em paralelo
    const [contentBased, collaborative, social] = await Promise.all([
      this._contentBasedRecs(profile, type, toExclude, limit * 2),
      this._collaborativeRecs(userId, profile, type, toExclude, limit),
      this._socialRecs(userId, toExclude, type, Math.floor(limit / 2)),
    ]);

    // Merge e deduplicação por mediaId
    const merged = new Map<string, MediaRecommendation>();

    const addToMerged = (rec: MediaRecommendation) => {
      const existing = merged.get(rec.mediaId);
      if (existing) {
        // Se já existe, soma os scores e une as razões
        existing.score += rec.score * 0.5;
        existing.reasons = [...new Set([...existing.reasons, ...rec.reasons])];
      } else {
        merged.set(rec.mediaId, { ...rec });
      }
    };

    contentBased.forEach(addToMerged);
    collaborative.forEach(addToMerged);
    social.forEach(addToMerged);

    const final = [...merged.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    await cache.set(cacheKey, final, CACHE_TTL.MEDIA_RECS);
    return final;
  }

  /** Content-Based: filtra candidatos pelo perfil de gosto. */
  private async _contentBasedRecs(
    profile: TasteProfile,
    type: "movie" | "series" | "all",
    exclude: string[],
    limit: number
  ): Promise<MediaRecommendation[]> {
    if (profile.topGenres.length === 0) return [];

    const topGenreIds = profile.topGenres.slice(0, 5).map((g) => g.genreId);

    // Busca mídia dos gêneros favoritos que o usuário não assistiu
    const typeCondition = type !== "all" ? [eq(media.type, type as "movie" | "series")] : [];
    const excludeCondition = exclude.length > 0 ? [notInArray(media.id, exclude.slice(0, 500))] : [];

    const candidates = await db
      .select({
        id:          media.id,
        tmdbId:      media.tmdbId,
        title:       media.title,
        posterPath:  media.posterPath,
        type:        media.type,
        releaseDate: media.releaseDate,
        voteAverage: media.voteAverage,
        popularity:  media.popularity,
        originalLanguage: media.originalLanguage,
      })
      .from(media)
      .innerJoin(mediaGenres, eq(media.id, mediaGenres.mediaId))
      .where(
        and(
          inArray(mediaGenres.genreId, topGenreIds),
          ...typeCondition,
          ...excludeCondition,
          gte(media.voteAverage, 6.0), // só recomenda coisas com nota mínima
          gte(media.voteCount,   100),  // pelo menos 100 votos no TMDB
        )
      )
      .groupBy(media.id)
      .orderBy(desc(media.popularity))
      .limit(limit * 3); // busca mais para ter margem de rankeamento

    if (candidates.length === 0) return [];

    // Buscar gêneros dos candidatos para calcular score de similaridade
    const candidateIds = candidates.map((c) => c.id);
    const genreRows = await db
      .select({ mediaId: mediaGenres.mediaId, genreId: mediaGenres.genreId })
      .from(mediaGenres)
      .where(inArray(mediaGenres.mediaId, candidateIds));

    const genresByMedia = new Map<string, string[]>();
    for (const row of genreRows) {
      if (!genresByMedia.has(row.mediaId)) genresByMedia.set(row.mediaId, []);
      genresByMedia.get(row.mediaId)!.push(row.genreId);
    }

    // Mapa de score por gênero para acesso rápido
    const genreScoreMap = new Map(profile.topGenres.map((g) => [g.genreId, g.score]));

    const recs: MediaRecommendation[] = [];

    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];

      const mediaGids = genresByMedia.get(candidate.id) ?? [];

      // Score de gênero: soma o score do perfil para cada gênero compartilhado
      let genreScore = 0;
      for (const gid of mediaGids) {
        const gs = genreScoreMap.get(gid) ?? 0;
        if (gs > 0) genreScore += gs;
      }
      if (genreScore > 0) {
        score += genreScore * WEIGHTS.GENRE_MATCH;
        const topMatchingGenre = profile.topGenres.find((g) => mediaGids.includes(g.genreId));
        if (topMatchingGenre) reasons.push(`Gênero favorito: ${topMatchingGenre.genreName}`);
      }

      // Boost para idioma preferido
      if (
        candidate.originalLanguage &&
        profile.topLanguages.some((l) => l.language === candidate.originalLanguage)
      ) {
        score += WEIGHTS.LANGUAGE_MATCH;
      }

      // Boost para décadas favoritas
      if (candidate.releaseDate) {
        const year = new Date(candidate.releaseDate).getFullYear();
        const decade = Math.floor(year / 10) * 10;
        if (profile.topDecades.some((d) => d.decade === decade)) {
          score += WEIGHTS.DECADE_MATCH;
          reasons.push(`Da sua época favorita: anos ${decade}s`);
        }
      }

      // Rating proximity: preferir mídia próxima do rating médio do usuário
      const ratingDiff = Math.abs(candidate.voteAverage / 2 - profile.avgRating);
      score += Math.max(0, WEIGHTS.RATING_PROXIMITY - ratingDiff);

      // Popularity boost suave (evita obscuridade total)
      score += Math.log10(Math.max(1, candidate.popularity)) * WEIGHTS.POPULARITY_BOOST;

      if (score > 0) {
        recs.push({
          mediaId:     candidate.id,
          tmdbId:      candidate.tmdbId,
          title:       candidate.title,
          posterPath:  candidate.posterPath,
          type:        candidate.type as "movie" | "series",
          releaseDate: candidate.releaseDate,
          voteAverage: candidate.voteAverage,
          score,
          reasons: reasons.length > 0 ? reasons : ["Baseado no seu perfil"],
          source: "content",
        });
      }
    }

    return recs.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Collaborative Filtering: usuários parecidos assistiram... */
  private async _collaborativeRecs(
    userId: string,
    profile: TasteProfile,
    type: "movie" | "series" | "all",
    exclude: string[],
    limit: number
  ): Promise<MediaRecommendation[]> {
    if (profile.totalWatched < 5) return []; // precisa de histórico mínimo

    // Encontrar os top 10 usuários mais similares
    const similarUsers = await this._findSimilarUsers(userId, profile, 10);
    if (similarUsers.length === 0) return [];

    const similarUserIds = similarUsers.map((u) => u.userId);
    const excludeSet = new Set(exclude);

    // Buscar o que usuários similares assistiram e gostaram (rating >= 3.5)
    const typeCondition = type !== "all" ? [eq(media.type, type as "movie" | "series")] : [];
    const excludeCondition = exclude.length > 0 ? [notInArray(diary.mediaId, exclude.slice(0, 500))] : [];

    const rows = await db
      .select({
        mediaId:     diary.mediaId,
        rating:      diary.rating,
        userId:      diary.userId,
        title:       media.title,
        posterPath:  media.posterPath,
        type:        media.type,
        releaseDate: media.releaseDate,
        voteAverage: media.voteAverage,
        tmdbId:      media.tmdbId,
      })
      .from(diary)
      .innerJoin(media, eq(diary.mediaId, media.id))
      .where(
        and(
          inArray(diary.userId, similarUserIds),
          gte(diary.rating, 3.5),
          ...typeCondition,
          ...excludeCondition,
        )
      )
      .limit(limit * 5);

    if (rows.length === 0) return [];

    // Agregar: score = Σ (similarityScore × ratingWeight)
    const mediaScores = new Map<string, {
      score: number;
      title: string;
      posterPath: string | null;
      type: string;
      releaseDate: string | null;
      voteAverage: number;
      tmdbId: number;
      count: number;
    }>();

    for (const row of rows) {
      if (excludeSet.has(row.mediaId)) continue;
      const simUser = similarUsers.find((u) => u.userId === row.userId);
      const similarity = simUser?.similarity ?? 0.1;
      const ratingWeight = row.rating ? (row.rating - 2.5) / 2.5 : 0.5;
      const contribution = similarity * ratingWeight;

      const existing = mediaScores.get(row.mediaId);
      if (existing) {
        existing.score += contribution;
        existing.count++;
      } else {
        mediaScores.set(row.mediaId, {
          score:       contribution,
          title:       row.title,
          posterPath:  row.posterPath,
          type:        row.type,
          releaseDate: row.releaseDate,
          voteAverage: row.voteAverage,
          tmdbId:      row.tmdbId,
          count:       1,
        });
      }
    }

    return [...mediaScores.entries()]
      .map(([mediaId, data]) => ({
        mediaId,
        tmdbId:      data.tmdbId,
        title:       data.title,
        posterPath:  data.posterPath,
        type:        data.type as "movie" | "series",
        releaseDate: data.releaseDate,
        voteAverage: data.voteAverage,
        score:       data.score * WEIGHTS.GENRE_MATCH,
        reasons:     [`${data.count} pessoa(s) com gosto similar adorou`],
        source:      "collaborative" as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Social Recs: o que as pessoas que você segue estão assistindo. */
  private async _socialRecs(
    userId: string,
    exclude: string[],
    type: "movie" | "series" | "all",
    limit: number
  ): Promise<MediaRecommendation[]> {
    // Buscar quem o usuário segue
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId))
      .limit(100);

    if (following.length === 0) return [];

    const followingIds = following.map((f) => f.followingId);
    const typeCondition = type !== "all" ? [eq(media.type, type as "movie" | "series")] : [];
    const excludeCondition = exclude.length > 0 ? [notInArray(diary.mediaId, exclude.slice(0, 500))] : [];

    const recentActivity = await db
      .select({
        mediaId:     diary.mediaId,
        userId:      diary.userId,
        rating:      diary.rating,
        watchedAt:   diary.watchedAt,
        title:       media.title,
        posterPath:  media.posterPath,
        type:        media.type,
        releaseDate: media.releaseDate,
        voteAverage: media.voteAverage,
        tmdbId:      media.tmdbId,
      })
      .from(diary)
      .innerJoin(media, eq(diary.mediaId, media.id))
      .where(
        and(
          inArray(diary.userId, followingIds),
          gte(diary.watchedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
          ...typeCondition,
          ...excludeCondition,
        )
      )
      .orderBy(desc(diary.watchedAt))
      .limit(limit * 3);

    const mediaScores = new Map<string, any>();
    for (const row of recentActivity) {
      const existing = mediaScores.get(row.mediaId);
      const ratingBoost = row.rating ? row.rating / 5 : 0.5;
      const recency = timeDecay(new Date(row.watchedAt), 168); // 1 semana half-life para social

      const contribution = ratingBoost * recency;
      if (existing) {
        existing.score += contribution;
        existing.count++;
      } else {
        mediaScores.set(row.mediaId, {
          score: contribution, count: 1,
          title: row.title, posterPath: row.posterPath,
          type: row.type, releaseDate: row.releaseDate,
          voteAverage: row.voteAverage, tmdbId: row.tmdbId,
        });
      }
    }

    return [...mediaScores.entries()]
      .map(([mediaId, data]) => ({
        mediaId,
        tmdbId: data.tmdbId, title: data.title, posterPath: data.posterPath,
        type: data.type as "movie" | "series", releaseDate: data.releaseDate,
        voteAverage: data.voteAverage,
        score: data.score,
        reasons: [`${data.count} pessoa(s) que você segue assistiu recentemente`],
        source: "social" as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Encontra os N usuários mais similares pelo vetor de gênero. */
  private async _findSimilarUsers(
    userId: string,
    profile: TasteProfile,
    limit: number
  ): Promise<Array<{ userId: string; similarity: number }>> {
    // Candidatos: usuários que assistiram filmes em comum
    if (profile.watchedMediaIds.size === 0) return [];
    const watchedArray = [...profile.watchedMediaIds].slice(0, 100);

    const candidates = await db
      .select({ userId: diary.userId, count: count() })
      .from(diary)
      .where(
        and(
          inArray(diary.mediaId, watchedArray),
          sql`${diary.userId} != ${userId}`,
        )
      )
      .groupBy(diary.userId)
      .having(sql`COUNT(*) >= 3`)  // mínimo de 3 filmes em comum
      .orderBy(desc(count()))
      .limit(50);

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map((c) => c.userId);

    // Calcular vetor de gênero para cada candidato
    const results: Array<{ userId: string; similarity: number }> = [];

    for (const candidate of candidateIds) {
      try {
        const candidateProfile = await tasteProfileService.buildProfile(candidate);
        if (candidateProfile.genreVector.length === 0) continue;

        // Alinhar vetores ao mesmo espaço de gêneros
        const myVector    = this._alignGenreVector(profile, candidateProfile);
        const otherVector = this._alignGenreVector(candidateProfile, profile);

        const similarity = cosineSimilarity(myVector, otherVector);
        if (similarity > 0.3) {
          results.push({ userId: candidate, similarity });
        }
      } catch {
        // Perfil falhou — pular
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  /** Alinha dois perfis ao mesmo espaço de gêneros para comparação. */
  private _alignGenreVector(source: TasteProfile, reference: TasteProfile): number[] {
    const refGenreIds = reference.topGenres.map((g) => g.genreId);
    const sourceMap = new Map(source.topGenres.map((g) => [g.genreId, Math.max(0, g.score)]));
    return normalizeVector(refGenreIds.map((id) => sourceMap.get(id) ?? 0));
  }
}

export const mediaRecService = new MediaRecommendationService();

// ─── Recomendação de Usuários ─────────────────────────────────────────────────

export class UserRecommendationService {
  /**
   * Retorna usuários que o `userId` deveria seguir.
   *
   * Algoritmo:
   *   score = (tasteSimilarity × W1) + (socialProximity × W2) +
   *           (activityOverlap × W3) + (engagementScore × W4) +
   *           (mutualFollowBoost × W5)
   */
  async getRecommendations(
    userId: string,
    limit = 20
  ): Promise<UserRecommendation[]> {
    const cacheKey = `user:recs:${userId}:${limit}`;
    const cached = await cache.get<UserRecommendation[]>(cacheKey);
    if (cached) return cached;

    const profile = await tasteProfileService.buildProfile(userId);

    // Candidatos: não seguidos, não bloqueados, ativo nos últimos 30 dias
    const alreadyFollowing = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const followingIds = alreadyFollowing.map((f) => f.followingId);
    const excludeIds   = [userId, ...followingIds];

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select({
        id:          userTable.id,
        username:    userTable.username,
        displayName: userTable.displayName,
        avatarUrl:   userTable.avatarUrl,
        lastActiveAt: userTable.lastActiveAt,
        isPremium:   userTable.isPremium,
      })
      .from(userTable)
      .where(
        and(
          notInArray(userTable.id, excludeIds),
          eq(userTable.status, "active"),
          gte(userTable.lastActiveAt, thirtyDaysAgo),
        )
      )
      .limit(200);

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map((c) => c.id);

    // Buscar dados de suporte em paralelo
    const [
      mutualFollowers,
      friendOfFriend,
      activityOverlap,
      engagementData,
    ] = await Promise.all([
      this._getMutualFollowers(userId, candidateIds),
      this._getFriendOfFriendScore(userId, candidateIds, followingIds),
      this._getActivityOverlap(userId, candidateIds, profile),
      this._getEngagementScores(candidateIds),
    ]);

    // Calcular score final para cada candidato
    const scored: UserRecommendation[] = [];

    for (const candidate of candidates) {
      try {
        const candidateProfile = await tasteProfileService.buildProfile(candidate.id);
        let score = 0;
        const reasons: string[] = [];

        // 1. Taste Similarity (cosine similarity entre vetores de gênero)
        let tasteSimilarity = 0;
        if (profile.genreVector.length > 0 && candidateProfile.genreVector.length > 0) {
          const myVec    = this._alignVectors(profile, candidateProfile);
          const otherVec = this._alignVectors(candidateProfile, profile);
          tasteSimilarity = cosineSimilarity(myVec, otherVec);
          score += tasteSimilarity * WEIGHTS.TASTE_SIMILARITY;
          if (tasteSimilarity > 0.7) reasons.push("Gosto muito similar ao seu");
          else if (tasteSimilarity > 0.4) reasons.push("Gostos em comum");
        }

        // 2. Social Proximity (amigos em comum)
        const fof = friendOfFriend.get(candidate.id) ?? 0;
        score += fof * WEIGHTS.SOCIAL_PROXIMITY;
        if (fof > 0) reasons.push(`${fof} seguidor(es) em comum`);

        // 3. Activity Overlap (filmes em comum)
        const overlap = activityOverlap.get(candidate.id) ?? 0;
        score += overlap * WEIGHTS.ACTIVITY_OVERLAP;
        if (overlap > 5) reasons.push(`${overlap} filmes em comum`);
        else if (overlap > 0) reasons.push(`${overlap} filme(s) em comum`);

        // 4. Engagement Score (qualidade do conteúdo)
        const engagement = engagementData.get(candidate.id) ?? 0;
        score += engagement * WEIGHTS.ENGAGEMENT_SCORE;
        if (engagement > 0.7 && candidateProfile.reviewRate > 0.3) {
          reasons.push("Escreveu muitas críticas");
        }

        // 5. Mutual Follow (já te segue — maior chance de follow back)
        const isMutual = mutualFollowers.has(candidate.id);
        if (isMutual) {
          score += WEIGHTS.MUTUAL_FOLLOWS;
          reasons.push("Já te segue");
        }

        // Premium boost suave
        if (candidate.isPremium) score *= 1.05;

        if (score > 0.5) {
          scored.push({
            userId:          candidate.id,
            username:        candidate.username ?? "",
            displayName:     candidate.displayName,
            avatarUrl:       candidate.avatarUrl,
            score,
            tasteSimilarity,
            commonMedia:     overlap,
            mutualFollows:   fof,
            reasons:         reasons.length > 0 ? reasons : ["Sugestão para você"],
            isFollowingBack: isMutual,
          });
        }
      } catch {
        // Falhou para este candidato — pular
      }
    }

    const result = scored.sort((a, b) => b.score - a.score).slice(0, limit);
    await cache.set(cacheKey, result, CACHE_TTL.USER_RECS);
    return result;
  }

  /** Quais candidatos já te seguem. */
  private async _getMutualFollowers(
    userId: string,
    candidateIds: string[]
  ): Promise<Set<string>> {
    const rows = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(
        and(
          inArray(follows.followerId, candidateIds),
          eq(follows.followingId, userId),
        )
      );
    return new Set(rows.map((r) => r.followerId));
  }

  /** Score de amigos em comum (BFS nível 2 simplificado). */
  private async _getFriendOfFriendScore(
    userId: string,
    candidateIds: string[],
    myFollowingIds: string[]
  ): Promise<Map<string, number>> {
    if (myFollowingIds.length === 0) return new Map();

    // Quem meus seguidos também seguem
    const fofRows = await db
      .select({ followingId: follows.followingId, count: count() })
      .from(follows)
      .where(
        and(
          inArray(follows.followerId, myFollowingIds),
          inArray(follows.followingId, candidateIds),
        )
      )
      .groupBy(follows.followingId);

    return new Map(fofRows.map((r) => [r.followingId, Number(r.count)]));
  }

  /** Quantos filmes em comum (assistidos por ambos). */
  private async _getActivityOverlap(
    userId: string,
    candidateIds: string[],
    profile: TasteProfile
  ): Promise<Map<string, number>> {
    if (profile.watchedMediaIds.size === 0) return new Map();
    const myWatched = [...profile.watchedMediaIds].slice(0, 200);

    const rows = await db
      .select({ userId: diary.userId, count: count() })
      .from(diary)
      .where(
        and(
          inArray(diary.userId, candidateIds),
          inArray(diary.mediaId, myWatched),
        )
      )
      .groupBy(diary.userId);

    return new Map(rows.map((r) => [r.userId, Number(r.count)]));
  }

  /** Score de engajamento: reviews, likes recebidos, listas públicas (0–1). */
  private async _getEngagementScores(
    candidateIds: string[]
  ): Promise<Map<string, number>> {
    const stats = await db
      .select({
        userId:         userStats.userId,
        reviewsCount:   userStats.reviewsCount,
        likesReceived:  userStats.likesReceived,
        listsCount:     userStats.listsCount,
        level:          userStats.level,
      })
      .from(userStats)
      .where(inArray(userStats.userId, candidateIds));

    const result = new Map<string, number>();
    for (const s of stats) {
      // Normalizar em 0–1 com log para reduzir outliers
      const reviewScore  = Math.min(1, Math.log10(Math.max(1, s.reviewsCount ?? 0)) / 2);
      const likeScore    = Math.min(1, Math.log10(Math.max(1, s.likesReceived ?? 0)) / 3);
      const listScore    = Math.min(1, Math.log10(Math.max(1, s.listsCount ?? 0)) / 1.5);
      const levelScore   = Math.min(1, (s.level ?? 1) / 50);
      const engagement   = (reviewScore + likeScore + listScore + levelScore) / 4;
      result.set(s.userId, engagement);
    }
    return result;
  }

  private _alignVectors(source: TasteProfile, reference: TasteProfile): number[] {
    const refIds   = reference.topGenres.map((g) => g.genreId);
    const srcMap   = new Map(source.topGenres.map((g) => [g.genreId, Math.max(0, g.score)]));
    return normalizeVector(refIds.map((id) => srcMap.get(id) ?? 0));
  }
}

export const userRecService = new UserRecommendationService();

// ─── Feed Inteligente ─────────────────────────────────────────────────────────

export class FeedService {
  /**
   * Feed personalizado e rankeado.
   *
   * Fontes de itens:
   *   - Atividades de quem o usuário segue
   *   - Recomendações de usuários para seguir (intercaladas)
   *   - Trending geral (fallback para usuários novos)
   *
   * Score de cada item:
   *   baseScore × timeDecay × relevanceMultiplier × diversityPenalty
   */
  async getRankedFeed(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    items: FeedItem[];
    suggestedUsers: UserRecommendation[];
    hasMore: boolean;
  }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const profile   = await tasteProfileService.buildProfile(userId);

    // Buscar atividades dos seguidos
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const followingIds = following.map((f) => f.followingId);

    let activityRows: any[] = [];

    if (followingIds.length > 0) {
      activityRows = await db
        .select({
          id:          activities.id,
          userId:      activities.userId,
          type:        activities.type,
          targetType:  activities.targetType,
          targetId:    activities.targetId,
          metadata:    activities.metadata,
          createdAt:   activities.createdAt,
          username:    userTable.username,
          displayName: userTable.displayName,
          avatarUrl:   userTable.avatarUrl,
        })
        .from(activities)
        .innerJoin(userTable, eq(activities.userId, userTable.id))
        .where(
          and(
            inArray(activities.userId, followingIds),
            gte(activities.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
          )
        )
        .orderBy(desc(activities.createdAt))
        .limit(limit * 5);
    }

    // Scoring de cada atividade
    const scored: Array<FeedItem & { rawScore: number }> = [];
    const seenMediaIds = new Set<string>(); // diversidade: não repetir mesma mídia

    for (const row of activityRows) {
      let baseScore = this._getActivityTypeWeight(row.type);

      // Time decay
      const decay = timeDecay(new Date(row.createdAt), WEIGHTS.HALF_LIFE_HOURS);
      baseScore *= decay;

      // Relevance multiplier: se a atividade envolve uma mídia dos gêneros favoritos
      let relevanceMultiplier = 1.0;
      const metadata = this._parseMetadata(row.metadata);

      if (row.targetType === "media" && row.targetId) {
        const isRelevant = await this._isMediaRelevant(row.targetId, profile);
        if (isRelevant) relevanceMultiplier = 1.5;

        // Diversity penalty: penaliza se a mesma mídia já apareceu
        if (seenMediaIds.has(row.targetId)) {
          relevanceMultiplier *= 0.3;
        } else {
          seenMediaIds.add(row.targetId);
        }
      }

      const finalScore = baseScore * relevanceMultiplier;

      scored.push({
        activityId:  row.id,
        userId:      row.userId,
        username:    row.username ?? "",
        displayName: row.displayName,
        avatarUrl:   row.avatarUrl,
        type:        row.type,
        targetType:  row.targetType,
        targetId:    row.targetId,
        metadata,
        score:       finalScore,
        rawScore:    finalScore,
        createdAt:   new Date(row.createdAt),
      });
    }

    const sortedFeed = scored
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    // Sugestões de usuários para intercalar no feed (topo + a cada N itens)
    const suggestedUsers = profile.activityLevel !== "low"
      ? await userRecService.getRecommendations(userId, 5)
      : [];

    return {
      items:          sortedFeed,
      suggestedUsers,
      hasMore:        scored.length > offset + limit,
    };
  }

  /** Peso base por tipo de atividade no feed. */
  private _getActivityTypeWeight(type: string): number {
    const weights: Record<string, number> = {
      review:           3.0,
      watched:          2.0,
      rating:           2.5,
      list:             2.0,
      achievement:      1.5,
      like:             0.8,
      follow:           1.0,
      watched_episode:  1.5,
    };
    return weights[type] ?? 1.0;
  }

  private _parseMetadata(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  }

  /** Verifica se uma mídia é relevante para o perfil (gêneros favoritos). */
  private async _isMediaRelevant(
    mediaId: string,
    profile: TasteProfile
  ): Promise<boolean> {
    if (profile.topGenres.length === 0) return false;
    const topGenreIds = profile.topGenres.slice(0, 5).map((g) => g.genreId);

    const [row] = await db
      .select({ mediaId: mediaGenres.mediaId })
      .from(mediaGenres)
      .where(
        and(
          eq(mediaGenres.mediaId, mediaId),
          inArray(mediaGenres.genreId, topGenreIds),
        )
      )
      .limit(1);

    return !!row;
  }
}

export const feedService = new FeedService();
