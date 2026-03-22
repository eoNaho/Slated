import { Elysia, t } from "elysia";
import {
  db,
  achievements,
  userAchievements,
  userStats,
  xpActivities,
  user,
  eq,
  desc,
  and,
} from "../db";
import { betterAuthPlugin, getOptionalSession } from "../lib/auth";

export const gamificationRoutes = new Elysia({ prefix: "/gamification", tags: ["Gamification"] })
  .use(betterAuthPlugin)

  // Get all achievements (with user progress if logged in)
  .get("/achievements", async ({ request }) => {
    const session = await getOptionalSession(request.headers);

    const allAchievements = await db
      .select()
      .from(achievements)
      .orderBy(achievements.xpReward);

    let userProgress = [] as any[];
    if (session?.user) {
      userProgress = await db
        .select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, session.user.id));
    }

    // Map achievements to include unlocked status
    return {
      data: allAchievements.map((a) => {
        const progress = userProgress.find((up) => up.achievementId === a.id);
        return {
          ...a,
          isUnlocked: !!progress,
          unlockedAt: progress?.unlockedAt,
          progress: progress?.progress || 0,
        };
      }),
    };
  })

  // Get user XP history
  .get(
    "/xp-history",
    async (ctx: any) => {
      const { user, query } = ctx;

      const limit = Math.min(Number(query.limit) || 20, 50);

      const history = await db
        .select()
        .from(xpActivities)
        .where(eq(xpActivities.userId, user.id))
        .orderBy(desc(xpActivities.createdAt))
        .limit(limit);

      return { data: history };
    },
    {
      requireAuth: true,
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    }
  )

  // Leaderboard (Top users by XP)
  .get(
    "/leaderboard",
    async ({ query }) => {
      const limit = Math.min(Number(query.limit) || 10, 50);

      const topUsers = await db
        .select({
          userId: userStats.userId,
          xp: userStats.xp,
          level: userStats.level,
          moviesWatched: userStats.moviesWatched,
          reviewsCount: userStats.reviewsCount,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        })
        .from(userStats)
        .innerJoin(user, eq(userStats.userId, user.id))
        .orderBy(desc(userStats.xp))
        .limit(limit);

      return { data: topUsers };
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    }
  );
