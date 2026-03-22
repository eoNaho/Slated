import { Elysia, t } from "elysia";
import {
  db,
  user as userTable,
  userStats,
  diary,
  ratings,
  reviews,
  lists,
  media,
  mediaGenres,
  genres,
  eq,
  sql,
  count,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import { cached, TTL } from "../lib/cache";

export const statsRoutes = new Elysia({ prefix: "/stats", tags: ["Admin"] })
  .use(betterAuthPlugin)

  // ==========================================================================
  // Get user stats (public)
  // ==========================================================================

  .get(
    "/user/:username",
    async ({ params, set }) => {
      // Find user
      const [user] = await db
        .select({ id: userTable.id, username: userTable.username })
        .from(userTable)
        .where(eq(userTable.username, params.username))
        .limit(1);

      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }

      return cached(`stats:user:${user.id}`, TTL.VOLATILE, async () => {
      const currentYear = new Date().getFullYear();

      // Run all independent queries in parallel
      const [
        [basicStats],
        [watchedCount],
        [ratingsCount],
        [reviewsCount],
        [listsCount],
        [hoursWatched],
        ratingDistribution,
        filmsByYear,
        topGenres,
        [avgRating],
      ] = await Promise.all([
        // Get basic stats from userStats table
        db.select().from(userStats).where(eq(userStats.userId, user.id)),
        // Count total watched (from diary)
        db.select({ total: count() }).from(diary).where(eq(diary.userId, user.id)),
        // Count total ratings
        db.select({ total: count() }).from(ratings).where(eq(ratings.userId, user.id)),
        // Count total reviews
        db.select({ total: count() }).from(reviews).where(eq(reviews.userId, user.id)),
        // Count total lists
        db.select({ total: count() }).from(lists).where(eq(lists.userId, user.id)),
        // Calculate total hours watched
        db.select({ totalMinutes: sql<number>`COALESCE(SUM(${media.runtime}), 0)` })
          .from(diary).innerJoin(media, eq(diary.mediaId, media.id)).where(eq(diary.userId, user.id)),
        // Rating distribution (0.5, 1, 1.5, ..., 5)
        db.select({ rating: ratings.rating, count: count() })
          .from(ratings).where(eq(ratings.userId, user.id))
          .groupBy(ratings.rating).orderBy(ratings.rating),
        // Films by year
        db.select({ year: sql<string>`EXTRACT(YEAR FROM ${media.releaseDate})`, count: count() })
          .from(diary).innerJoin(media, eq(diary.mediaId, media.id))
          .where(eq(diary.userId, user.id))
          .groupBy(sql`EXTRACT(YEAR FROM ${media.releaseDate})`)
          .orderBy(sql`EXTRACT(YEAR FROM ${media.releaseDate}) DESC`).limit(15),
        // Top genres
        db.select({ genreId: genres.id, genreName: genres.name, count: count() })
          .from(diary).innerJoin(media, eq(diary.mediaId, media.id))
          .innerJoin(mediaGenres, eq(media.id, mediaGenres.mediaId))
          .innerJoin(genres, eq(mediaGenres.genreId, genres.id))
          .where(eq(diary.userId, user.id))
          .groupBy(genres.id, genres.name).orderBy(sql`COUNT(*) DESC`).limit(10),
        // Average rating
        db.select({ average: sql<number>`COALESCE(AVG(${ratings.rating}), 0)` })
          .from(ratings).where(eq(ratings.userId, user.id)),
      ]);

      return {
        data: {
          username: user.username,
          counts: {
            watched: watchedCount?.total || 0,
            ratings: ratingsCount?.total || 0,
            reviews: reviewsCount?.total || 0,
            lists: listsCount?.total || 0,
            hoursWatched: Math.round((hoursWatched?.totalMinutes || 0) / 60),
          },
          averageRating: Number(avgRating?.average || 0).toFixed(1),
          ratingDistribution: ratingDistribution.reduce(
            (acc, item) => {
              acc[String(item.rating)] = item.count;
              return acc;
            },
            {} as Record<string, number>,
          ),
          filmsByYear: filmsByYear.map((f) => ({
            year: f.year,
            count: f.count,
          })),
          topGenres: topGenres.map((g) => ({
            id: g.genreId,
            name: g.genreName,
            count: g.count,
          })),
          // Legacy fields from userStats
          level: basicStats?.level || 1,
          xp: basicStats?.xp || 0,
          streak: basicStats?.currentStreak || 0,
        },
      };
      }); // end cached
    },
    {
      params: t.Object({ username: t.String() }),
    },
  )

  // ==========================================================================
  // Get my stats
  // ==========================================================================

  .get(
    "/me",
    async (ctx: any) => {
      const { user: authUser } = ctx;

      // Get user
      const [userData] = await db
        .select({ username: userTable.username })
        .from(userTable)
        .where(eq(userTable.id, authUser.id))
        .limit(1);

      // Redirect to public stats (reuse logic)
      // This could be refactored to a shared function
      return {
        redirect: `/api/v1/stats/user/${userData?.username}`,
      };
    },
    { requireAuth: true },
  );
