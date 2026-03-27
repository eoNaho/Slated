/**
 * PixelReel — Recommendation Engine
 *
 * Hybrid algorithm in 3 layers:
 *   1. Content-Based Filtering  → genre/decade/language matching
 *   2. Collaborative Filtering  → users with similar taste watched...
 *   3. Social Graph Signals     → people you follow are watching...
 *
 * For USER recommendations (follow suggestions):
 *   1. Taste Similarity Score   → genre/decade/rating vectors
 *   2. Social Distance          → friend-of-friend (BFS level 2)
 *   3. Activity Overlap         → watched the same films
 *   4. Engagement Score         → how active/quality is the user
 */

import {
  db,
  media,
  genres,
  mediaGenres,
  diary,
  reviews,
  likes,
  follows,
  activities,
  user as userTable,
  userStats,
  eq,
  and,
  desc,
  inArray,
  notInArray,
  count,
  sql,
  gte,
} from "../db";
import {
  recommendationFeedback,
  recommendationExplanations,
} from "../db/schema/recommendations";
import { cache } from "../lib/redis";
import { logger } from "../utils/logger";

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL = {
  TASTE_PROFILE: 30 * 60,     // 30 min
  MEDIA_RECS:    60 * 60,     // 1 hour
  USER_RECS:     2 * 60 * 60, // 2 hours
  FEED_SCORE:    5 * 60,      // 5 min
};

const WEIGHTS = {
  // Media score weights
  GENRE_MATCH:          3.0,
  COLLABORATIVE_BOOST:  2.0, // Bug 3 fix: separate weight for collaborative
  DIRECTOR_MATCH:       4.0,
  ACTOR_MATCH:          1.5,
  DECADE_MATCH:         2.0,
  LANGUAGE_MATCH:       1.0,
  RATING_PROXIMITY:     2.0,
  POPULARITY_BOOST:     0.5,
  RECENCY_WEIGHT:       1.5,

  // User score weights
  TASTE_SIMILARITY:  5.0,
  SOCIAL_PROXIMITY:  3.0,
  ACTIVITY_OVERLAP:  4.0,
  ENGAGEMENT_SCORE:  2.0,
  MUTUAL_FOLLOWS:    2.5,

  // Feed decay
  HALF_LIFE_HOURS: 48,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TasteProfile {
  userId: string;
  topGenres: Array<{ genreId: string; genreName: string; score: number }>;
  topDecades: Array<{ decade: number; score: number }>;
  topLanguages: Array<{ language: string; score: number }>;
  avgRating: number;
  ratingStdDev: number;
  watchedMediaIds: Set<string>;
  genreVector: number[];
  totalWatched: number;
  reviewRate: number;
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
  score: number;
  reasons: string[];
  source: "content" | "collaborative" | "social" | "trending";
}

export interface UserRecommendation {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  score: number;
  tasteSimilarity: number;
  commonMedia: number;
  mutualFollows: number;
  reasons: string[];
  isFollowingBack: boolean;
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
  socialProofCount: number;
  createdAt: Date;
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const dot  = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function timeDecay(createdAt: Date, halfLifeHours = WEIGHTS.HALF_LIFE_HOURS): number {
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return Math.pow(0.5, ageHours / halfLifeHours);
}

export function normalizeVector(v: number[]): number[] {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (mag === 0) return v.map(() => 0);
  return v.map((x) => x / mag);
}

/**
 * Bug 4 fix: Align both profiles to the UNION of genre IDs so vectors are
 * in the same reference space for cosine similarity.
 */
export function alignGenreVectors(
  profileA: TasteProfile,
  profileB: TasteProfile
): [number[], number[]] {
  const allGenreIds = [
    ...new Set([
      ...profileA.topGenres.map((g) => g.genreId),
      ...profileB.topGenres.map((g) => g.genreId),
    ]),
  ];
  const mapA = new Map(profileA.topGenres.map((g) => [g.genreId, Math.max(0, g.score)]));
  const mapB = new Map(profileB.topGenres.map((g) => [g.genreId, Math.max(0, g.score)]));
  const vecA = normalizeVector(allGenreIds.map((id) => mapA.get(id) ?? 0));
  const vecB = normalizeVector(allGenreIds.map((id) => mapB.get(id) ?? 0));
  return [vecA, vecB];
}

// ─── Taste Profile ────────────────────────────────────────────────────────────

export class TasteProfileService {
  async buildProfile(userId: string, forceRefresh = false): Promise<TasteProfile> {
    const cacheKey = `taste:profile:${userId}`;

    if (!forceRefresh) {
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        // Bug 2 fix: reconstitute Set from serialized array
        return {
          ...cached,
          watchedMediaIds: new Set(cached.watchedMediaIds as string[]),
        } as TasteProfile;
      }
    }

    // ── 1. Fetch watched history ───────────────────────────────────────────

    const diaryEntries = await db
      .select({
        mediaId:   diary.mediaId,
        rating:    diary.rating,
        watchedAt: diary.watchedAt,
      })
      .from(diary)
      .where(eq(diary.userId, userId))
      .orderBy(desc(diary.watchedAt))
      .limit(500);

    // ── 2. Build score map from diary ─────────────────────────────────────

    const mediaScoreMap = new Map<string, { rating: number; recency: number }>();

    for (const entry of diaryEntries) {
      // Bug 5 fix: guard date parsing for YYYY-MM-DD strings
      const watchDate = new Date(entry.watchedAt + "T00:00:00Z");
      const ageMonths = (Date.now() - watchDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const recency   = 1 / (1 + ageMonths / 6);
      const rating    = entry.rating ?? 3.0;
      mediaScoreMap.set(entry.mediaId, { rating, recency });
    }

    const watchedIds = [...mediaScoreMap.keys()];

    // ── 2b. Incorporate likes as taste signals ────────────────────────────
    // Likes signal interest without implying the user has watched the media,
    // so we use them for genre/decade/language accumulation but NOT for
    // the watchedMediaIds exclusion set (liked media can still be recommended).

    const likedRows = await db
      .select({ targetId: likes.targetId })
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.targetType, "media")))
      .limit(200);

    // Liked media not already in diary — treat as a strong positive signal (≈ 4.0 rating)
    const LIKE_SYNTHETIC_RATING = 4.0;
    const likeScoreMap = new Map<string, { rating: number; recency: number }>();
    for (const row of likedRows) {
      if (!mediaScoreMap.has(row.targetId)) {
        likeScoreMap.set(row.targetId, { rating: LIKE_SYNTHETIC_RATING, recency: 1.0 });
      }
    }
    const likedOnlyIds = [...likeScoreMap.keys()];

    // Combined ID list for genre/decade/language queries
    const allProfileMediaIds = [...watchedIds, ...likedOnlyIds];

    // ── 3. Fetch genres and accumulate ────────────────────────────────────

    const genreAccumulator    = new Map<string, { name: string; score: number }>();
    const decadeAccumulator   = new Map<number, number>();
    const languageAccumulator = new Map<string, number>();
    let ratingSum   = 0;
    let ratingCount = 0;
    const ratingValues: number[] = [];

    if (allProfileMediaIds.length > 0) {
      const mediaDetails = await db
        .select({
          id:               media.id,
          releaseDate:      media.releaseDate,
          originalLanguage: media.originalLanguage,
        })
        .from(media)
        .where(inArray(media.id, allProfileMediaIds));

      const genreRows = await db
        .select({
          mediaId:   mediaGenres.mediaId,
          genreId:   genres.id,
          genreName: genres.name,
        })
        .from(mediaGenres)
        .innerJoin(genres, eq(mediaGenres.genreId, genres.id))
        .where(inArray(mediaGenres.mediaId, allProfileMediaIds));

      const genresByMedia = new Map<string, Array<{ id: string; name: string }>>();
      for (const row of genreRows) {
        if (!genresByMedia.has(row.mediaId)) genresByMedia.set(row.mediaId, []);
        genresByMedia.get(row.mediaId)!.push({ id: row.genreId, name: row.genreName });
      }

      for (const m of mediaDetails) {
        const entry = mediaScoreMap.get(m.id) ?? likeScoreMap.get(m.id);
        if (!entry) continue;

        const { rating, recency } = entry;
        const contribution = (rating - 2.5) * recency;

        for (const g of genresByMedia.get(m.id) ?? []) {
          const current = genreAccumulator.get(g.id) ?? { name: g.name, score: 0 };
          genreAccumulator.set(g.id, { name: g.name, score: current.score + contribution });
        }

        if (m.releaseDate) {
          const year   = new Date(m.releaseDate).getFullYear();
          const decade = Math.floor(year / 10) * 10;
          decadeAccumulator.set(decade, (decadeAccumulator.get(decade) ?? 0) + recency);
        }

        if (m.originalLanguage) {
          languageAccumulator.set(
            m.originalLanguage,
            (languageAccumulator.get(m.originalLanguage) ?? 0) + recency
          );
        }

        // Only count actual ratings from diary entries (not synthetic like ratings)
        if (mediaScoreMap.has(m.id) && entry.rating != null) {
          ratingSum += entry.rating;
          ratingCount++;
          ratingValues.push(entry.rating);
        }
      }
    }

    // ── 4. Calculate rating stats ──────────────────────────────────────────

    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 3.0;
    const ratingStdDev =
      ratingValues.length > 1
        ? Math.sqrt(
            ratingValues.reduce((s, r) => s + Math.pow(r - avgRating, 2), 0) /
              ratingValues.length
          )
        : 0;

    // ── 5. Build sorted vectors ────────────────────────────────────────────

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

    const TOP_GENRE_IDS = topGenres.map((g) => g.genreId);
    const genreVector = normalizeVector(
      TOP_GENRE_IDS.map((id) => {
        const g = genreAccumulator.get(id);
        return g ? Math.max(0, g.score) : 0;
      })
    );

    const reviewCount = await db
      .select({ n: count() })
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .then((r) => Number(r[0].n));

    const reviewRate      = watchedIds.length > 0 ? reviewCount / watchedIds.length : 0;
    const activityLevel   = watchedIds.length >= 100 ? "high" : watchedIds.length >= 20 ? "medium" : "low";

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

    // Serialize Set → array for Redis storage
    await cache.set(
      cacheKey,
      { ...profile, watchedMediaIds: watchedIds },
      CACHE_TTL.TASTE_PROFILE
    );

    return profile;
  }

  /** Invalidate profile cache after new watch/diary entry. */
  async invalidate(userId: string): Promise<void> {
    // Bug 5 fix: use cache.del() directly instead of cache.set(null)
    await cache.del(`taste:profile:${userId}`);
    // Also clear media recs cache since profile changed
    await cache.del(`media:recs:${userId}:all:20`);
  }
}

export const tasteProfileService = new TasteProfileService();

// ─── Media Recommendations ────────────────────────────────────────────────────

export class MediaRecommendationService {
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

    const profile  = await tasteProfileService.buildProfile(userId);
    const toExclude = excludeWatched ? [...profile.watchedMediaIds] : [];

    // Filter out negatively-rated recommendations
    const negativeFeedback = await db
      .select({ targetId: recommendationFeedback.targetId })
      .from(recommendationFeedback)
      .where(
        and(
          eq(recommendationFeedback.userId, userId),
          eq(recommendationFeedback.recType, "media"),
          inArray(recommendationFeedback.feedback, ["not_interested", "not_my_taste"])
        )
      );
    const blockedIds = new Set(negativeFeedback.map((f) => f.targetId));

    const [contentBased, collaborative, social] = await Promise.all([
      this._contentBasedRecs(profile, type, toExclude, limit * 2),
      this._collaborativeRecs(userId, profile, type, toExclude, limit),
      this._socialRecs(userId, toExclude, type, Math.floor(limit / 2)),
    ]);

    const merged = new Map<string, MediaRecommendation>();

    const addToMerged = (rec: MediaRecommendation) => {
      if (blockedIds.has(rec.mediaId)) return;
      const existing = merged.get(rec.mediaId);
      if (existing) {
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

    // Persist explanations for "because you watched X" UI
    await this._persistExplanations(userId, final).catch(() => {});

    await cache.set(cacheKey, final, CACHE_TTL.MEDIA_RECS);
    return final;
  }

  private async _persistExplanations(
    userId: string,
    recs: MediaRecommendation[]
  ): Promise<void> {
    if (recs.length === 0) return;

    // Clear old explanations for this user
    await db
      .delete(recommendationExplanations)
      .where(eq(recommendationExplanations.userId, userId));

    // Insert new ones
    const rows = recs.map((rec) => ({
      userId,
      targetMediaId: rec.mediaId,
      explanationType: rec.source,
      explanationText: rec.reasons[0] ?? "Based on your profile",
      score: rec.score,
    }));

    if (rows.length > 0) {
      await db.insert(recommendationExplanations).values(rows);
    }
  }

  private async _contentBasedRecs(
    profile: TasteProfile,
    type: "movie" | "series" | "all",
    exclude: string[],
    limit: number
  ): Promise<MediaRecommendation[]> {
    if (profile.topGenres.length === 0) return [];

    const topGenreIds     = profile.topGenres.slice(0, 5).map((g) => g.genreId);
    const typeCondition   = type !== "all" ? [eq(media.type, type as "movie" | "series")] : [];
    const excludeCondition = exclude.length > 0 ? [notInArray(media.id, exclude.slice(0, 500))] : [];

    const candidates = await db
      .select({
        id:               media.id,
        tmdbId:           media.tmdbId,
        title:            media.title,
        posterPath:       media.posterPath,
        type:             media.type,
        releaseDate:      media.releaseDate,
        voteAverage:      media.voteAverage,
        popularity:       media.popularity,
        originalLanguage: media.originalLanguage,
      })
      .from(media)
      .innerJoin(mediaGenres, eq(media.id, mediaGenres.mediaId))
      .where(
        and(
          inArray(mediaGenres.genreId, topGenreIds),
          ...typeCondition,
          ...excludeCondition,
          gte(media.voteAverage, 6.0),
          gte(media.voteCount, 100),
        )
      )
      .groupBy(media.id)
      .orderBy(desc(media.popularity))
      .limit(limit * 3);

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map((c) => c.id);
    const genreRows    = await db
      .select({ mediaId: mediaGenres.mediaId, genreId: mediaGenres.genreId })
      .from(mediaGenres)
      .where(inArray(mediaGenres.mediaId, candidateIds));

    const genresByMedia = new Map<string, string[]>();
    for (const row of genreRows) {
      if (!genresByMedia.has(row.mediaId)) genresByMedia.set(row.mediaId, []);
      genresByMedia.get(row.mediaId)!.push(row.genreId);
    }

    const genreScoreMap = new Map(profile.topGenres.map((g) => [g.genreId, g.score]));
    const recs: MediaRecommendation[] = [];

    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];
      const mediaGids = genresByMedia.get(candidate.id) ?? [];

      let genreScore = 0;
      for (const gid of mediaGids) {
        const gs = genreScoreMap.get(gid) ?? 0;
        if (gs > 0) genreScore += gs;
      }
      if (genreScore > 0) {
        score += genreScore * WEIGHTS.GENRE_MATCH;
        const topMatchingGenre = profile.topGenres.find((g) => mediaGids.includes(g.genreId));
        if (topMatchingGenre) reasons.push(`Favorite genre: ${topMatchingGenre.genreName}`);
      }

      if (
        candidate.originalLanguage &&
        profile.topLanguages.some((l) => l.language === candidate.originalLanguage)
      ) {
        score += WEIGHTS.LANGUAGE_MATCH;
      }

      if (candidate.releaseDate) {
        const year   = new Date(candidate.releaseDate).getFullYear();
        const decade = Math.floor(year / 10) * 10;
        if (profile.topDecades.some((d) => d.decade === decade)) {
          score += WEIGHTS.DECADE_MATCH;
          reasons.push(`From your favorite era: ${decade}s`);
        }
      }

      const voteAvg    = candidate.voteAverage ?? 0;
      const ratingDiff = Math.abs(voteAvg / 2 - profile.avgRating);
      score += Math.max(0, WEIGHTS.RATING_PROXIMITY - ratingDiff);
      score += Math.log10(Math.max(1, candidate.popularity ?? 0)) * WEIGHTS.POPULARITY_BOOST;

      if (score > 0) {
        recs.push({
          mediaId:     candidate.id,
          tmdbId:      candidate.tmdbId,
          title:       candidate.title,
          posterPath:  candidate.posterPath,
          type:        candidate.type as "movie" | "series",
          releaseDate: candidate.releaseDate,
          voteAverage: voteAvg,
          score,
          reasons: reasons.length > 0 ? reasons : ["Based on your profile"],
          source: "content",
        });
      }
    }

    return recs.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async _collaborativeRecs(
    userId: string,
    profile: TasteProfile,
    type: "movie" | "series" | "all",
    exclude: string[],
    limit: number
  ): Promise<MediaRecommendation[]> {
    if (profile.totalWatched < 5) return [];

    const similarUsers = await this._findSimilarUsers(userId, profile, 10);
    if (similarUsers.length === 0) return [];

    const similarUserIds  = similarUsers.map((u) => u.userId);
    const excludeSet      = new Set(exclude);
    const typeCondition   = type !== "all" ? [eq(media.type, type as "movie" | "series")] : [];
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

    const mediaScores = new Map<string, {
      score:       number;
      title:       string;
      posterPath:  string | null;
      type:        string;
      releaseDate: string | null;
      voteAverage: number;
      tmdbId:      number;
      count:       number;
    }>();

    for (const row of rows) {
      if (excludeSet.has(row.mediaId)) continue;
      const simUser       = similarUsers.find((u) => u.userId === row.userId);
      const similarity    = simUser?.similarity ?? 0.1;
      const ratingWeight  = row.rating ? (row.rating - 2.5) / 2.5 : 0.5;
      const contribution  = similarity * ratingWeight;

      const existing = mediaScores.get(row.mediaId);
      if (existing) {
        existing.score += contribution;
        existing.count++;
      } else {
        mediaScores.set(row.mediaId, {
          score: contribution, title: row.title, posterPath: row.posterPath,
          type: row.type, releaseDate: row.releaseDate,
          voteAverage: row.voteAverage ?? 0, tmdbId: row.tmdbId, count: 1,
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
        // Bug 3 fix: use COLLABORATIVE_BOOST instead of GENRE_MATCH
        score:       data.score * WEIGHTS.COLLABORATIVE_BOOST,
        reasons:     [`${data.count} person(s) with similar taste loved it`],
        source:      "collaborative" as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async _socialRecs(
    userId: string,
    exclude: string[],
    type: "movie" | "series" | "all",
    limit: number
  ): Promise<MediaRecommendation[]> {
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")))
      .limit(100);

    if (following.length === 0) return [];

    const followingIds    = following.map((f) => f.followingId);
    const typeCondition   = type !== "all" ? [eq(media.type, type as "movie" | "series")] : [];
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
      const ratingBoost   = row.rating ? row.rating / 5 : 0.5;
      // Bug 5 fix: guard date parsing
      const watchDate     = new Date(row.watchedAt + "T00:00:00Z");
      const recency       = timeDecay(watchDate, 168);
      const contribution  = ratingBoost * recency;

      const existing = mediaScores.get(row.mediaId);
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
        reasons: [`${data.count} person(s) you follow watched this recently`],
        source: "social" as const,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async _findSimilarUsers(
    userId: string,
    profile: TasteProfile,
    limit: number
  ): Promise<Array<{ userId: string; similarity: number }>> {
    if (profile.watchedMediaIds.size === 0) return [];
    // Bug 7 fix: defensive array conversion
    const watchedMediaArr = Array.isArray(profile.watchedMediaIds)
      ? (profile.watchedMediaIds as unknown as string[])
      : [...profile.watchedMediaIds];
    const watchedArray = watchedMediaArr.slice(0, 100);

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
      .having(sql`COUNT(*) >= 3`)
      .orderBy(desc(count()))
      .limit(50);

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map((c) => c.userId);
    const results: Array<{ userId: string; similarity: number }> = [];

    for (const candidate of candidateIds) {
      try {
        const candidateProfile = await tasteProfileService.buildProfile(candidate);
        if (candidateProfile.genreVector.length === 0) continue;

        // Bug 4 fix: align both to union of genre IDs
        const [myVec, otherVec] = alignGenreVectors(profile, candidateProfile);
        const similarity = cosineSimilarity(myVec, otherVec);

        if (similarity > 0.3) {
          results.push({ userId: candidate, similarity });
        }
      } catch {
        // Skip failed profile
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }
}

export const mediaRecService = new MediaRecommendationService();

// ─── User Recommendations ─────────────────────────────────────────────────────

export class UserRecommendationService {
  async getRecommendations(
    userId: string,
    limit = 20
  ): Promise<UserRecommendation[]> {
    const cacheKey = `user:recs:${userId}:${limit}`;
    const cached   = await cache.get<UserRecommendation[]>(cacheKey);
    if (cached) return cached;

    const profile = await tasteProfileService.buildProfile(userId);

    const alreadyFollowing = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")));

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

    const [mutualFollowers, friendOfFriend, activityOverlap, engagementData] =
      await Promise.all([
        this._getMutualFollowers(userId, candidateIds),
        this._getFriendOfFriendScore(userId, candidateIds, followingIds),
        this._getActivityOverlap(userId, candidateIds, profile),
        this._getEngagementScores(candidateIds),
      ]);

    const scored: UserRecommendation[] = [];

    for (const candidate of candidates) {
      try {
        const candidateProfile = await tasteProfileService.buildProfile(candidate.id);
        let score = 0;
        const reasons: string[] = [];

        let tasteSimilarity = 0;
        if (profile.genreVector.length > 0 && candidateProfile.genreVector.length > 0) {
          // Bug 4 fix: use alignGenreVectors for consistent reference space
          const [myVec, otherVec] = alignGenreVectors(profile, candidateProfile);
          tasteSimilarity = cosineSimilarity(myVec, otherVec);
          score += tasteSimilarity * WEIGHTS.TASTE_SIMILARITY;
          if (tasteSimilarity > 0.7)      reasons.push("Very similar taste");
          else if (tasteSimilarity > 0.4) reasons.push("Taste in common");
        }

        const fof = friendOfFriend.get(candidate.id) ?? 0;
        score += fof * WEIGHTS.SOCIAL_PROXIMITY;
        if (fof > 0) reasons.push(`${fof} mutual follower(s)`);

        const overlap = activityOverlap.get(candidate.id) ?? 0;
        score += overlap * WEIGHTS.ACTIVITY_OVERLAP;
        if (overlap > 5)      reasons.push(`${overlap} films in common`);
        else if (overlap > 0) reasons.push(`${overlap} film(s) in common`);

        const engagement = engagementData.get(candidate.id) ?? 0;
        score += engagement * WEIGHTS.ENGAGEMENT_SCORE;
        if (engagement > 0.7 && candidateProfile.reviewRate > 0.3) {
          reasons.push("Writes great reviews");
        }

        const isMutual = mutualFollowers.has(candidate.id);
        if (isMutual) {
          score += WEIGHTS.MUTUAL_FOLLOWS;
          reasons.push("Already follows you");
        }

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
            reasons:         reasons.length > 0 ? reasons : ["Suggested for you"],
            isFollowingBack: isMutual,
          });
        }
      } catch {
        // Skip failed candidate
      }
    }

    const result = scored.sort((a, b) => b.score - a.score).slice(0, limit);
    await cache.set(cacheKey, result, CACHE_TTL.USER_RECS);
    return result;
  }

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
          eq(follows.status, "accepted"),
        )
      );
    return new Set(rows.map((r) => r.followerId));
  }

  private async _getFriendOfFriendScore(
    userId: string,
    candidateIds: string[],
    myFollowingIds: string[]
  ): Promise<Map<string, number>> {
    if (myFollowingIds.length === 0) return new Map();

    const fofRows = await db
      .select({ followingId: follows.followingId, count: count() })
      .from(follows)
      .where(
        and(
          inArray(follows.followerId, myFollowingIds),
          inArray(follows.followingId, candidateIds),
          eq(follows.status, "accepted"),
        )
      )
      .groupBy(follows.followingId);

    return new Map(fofRows.map((r) => [r.followingId, Number(r.count)]));
  }

  private async _getActivityOverlap(
    userId: string,
    candidateIds: string[],
    profile: TasteProfile
  ): Promise<Map<string, number>> {
    if (profile.watchedMediaIds.size === 0) return new Map();
    const watchedArr = Array.isArray(profile.watchedMediaIds)
      ? (profile.watchedMediaIds as unknown as string[])
      : [...profile.watchedMediaIds];
    const myWatched = watchedArr.slice(0, 200);

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

  private async _getEngagementScores(
    candidateIds: string[]
  ): Promise<Map<string, number>> {
    const stats = await db
      .select({
        userId:        userStats.userId,
        reviewsCount:  userStats.reviewsCount,
        likesReceived: userStats.likesReceived,
        listsCount:    userStats.listsCount,
        level:         userStats.level,
      })
      .from(userStats)
      .where(inArray(userStats.userId, candidateIds));

    const result = new Map<string, number>();
    for (const s of stats) {
      const reviewScore = Math.min(1, Math.log10(Math.max(1, s.reviewsCount ?? 0)) / 2);
      const likeScore   = Math.min(1, Math.log10(Math.max(1, s.likesReceived ?? 0)) / 3);
      const listScore   = Math.min(1, Math.log10(Math.max(1, s.listsCount ?? 0)) / 1.5);
      const levelScore  = Math.min(1, (s.level ?? 1) / 50);
      result.set(s.userId, (reviewScore + likeScore + listScore + levelScore) / 4);
    }
    return result;
  }
}

export const userRecService = new UserRecommendationService();

// ─── Feed Service ─────────────────────────────────────────────────────────────

export class FeedService {
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

    const profile = await tasteProfileService.buildProfile(userId);

    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")));

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

    // Bug 8 fix: batch-fetch relevant media in one query instead of N+1
    const mediaActivityIds = activityRows
      .filter((r) => r.targetType === "media" && r.targetId)
      .map((r) => r.targetId as string);

    const relevantMediaSet = await this._batchCheckRelevance(mediaActivityIds, profile);

    // Count how many follows watched the same media (social proof)
    const socialProofCounts = new Map<string, number>();
    for (const row of activityRows) {
      if (row.targetType === "media" && row.targetId) {
        socialProofCounts.set(
          row.targetId,
          (socialProofCounts.get(row.targetId) ?? 0) + 1
        );
      }
    }

    const scored: Array<FeedItem & { rawScore: number }> = [];
    const seenMediaIds = new Set<string>();

    for (const row of activityRows) {
      let baseScore = this._getActivityTypeWeight(row.type);
      const decay   = timeDecay(new Date(row.createdAt), WEIGHTS.HALF_LIFE_HOURS);
      baseScore *= decay;

      let relevanceMultiplier = 1.0;

      if (row.targetType === "media" && row.targetId) {
        if (relevantMediaSet.has(row.targetId)) relevanceMultiplier = 1.5;

        if (seenMediaIds.has(row.targetId)) {
          relevanceMultiplier *= 0.3;
        } else {
          seenMediaIds.add(row.targetId);
        }
      }

      const finalScore = baseScore * relevanceMultiplier;

      scored.push({
        activityId:     row.id,
        userId:         row.userId,
        username:       row.username ?? "",
        displayName:    row.displayName,
        avatarUrl:      row.avatarUrl,
        type:           row.type,
        targetType:     row.targetType,
        targetId:       row.targetId,
        metadata:       this._parseMetadata(row.metadata),
        score:          finalScore,
        rawScore:       finalScore,
        socialProofCount: row.targetId ? (socialProofCounts.get(row.targetId) ?? 0) : 0,
        createdAt:      new Date(row.createdAt),
      });
    }

    const sortedFeed = scored
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    const suggestedUsers =
      profile.activityLevel !== "low"
        ? await userRecService.getRecommendations(userId, 5)
        : [];

    return {
      items:      sortedFeed,
      suggestedUsers,
      hasMore:    scored.length > offset + limit,
    };
  }

  /** Bug 8 fix: batch-check all media IDs for genre relevance in one query. */
  private async _batchCheckRelevance(
    mediaIds: string[],
    profile: TasteProfile
  ): Promise<Set<string>> {
    if (mediaIds.length === 0 || profile.topGenres.length === 0) return new Set();

    const topGenreIds = profile.topGenres.slice(0, 5).map((g) => g.genreId);

    const rows = await db
      .select({ mediaId: mediaGenres.mediaId })
      .from(mediaGenres)
      .where(
        and(
          inArray(mediaGenres.mediaId, mediaIds),
          inArray(mediaGenres.genreId, topGenreIds),
        )
      );

    return new Set(rows.map((r) => r.mediaId));
  }

  private _getActivityTypeWeight(type: string): number {
    const weights: Record<string, number> = {
      review:          3.0,
      watched:         2.0,
      rating:          2.5,
      list:            2.0,
      achievement:     1.5,
      like:            0.8,
      follow:          1.0,
      watched_episode: 1.5,
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
}

export const feedService = new FeedService();
