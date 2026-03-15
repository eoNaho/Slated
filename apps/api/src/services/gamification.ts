import {
  db,
  achievements,
  userAchievements,
  userStats,
  xpActivities,
  eq,
  and,
  sql,
} from "../db";

export class GamificationService {
  // Award XP to user
  async awardXP(
    userId: string,
    amount: number,
    type: string,
    description: string
  ) {
    // 1. Add XP activity log
    await db.insert(xpActivities).values({
      userId,
      type,
      xpGained: amount,
      description,
    });

    // 2. Update user stats and level
    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId))
      .limit(1);

    if (!stats) return; // Should not happen

    const newXP = (stats.xp || 0) + amount;
    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;

    await db
      .update(userStats)
      .set({
        xp: newXP,
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(userStats.userId, userId));

    return { newXP, newLevel, leveledUp: newLevel > (stats.level || 1) };
  }

  // Check and unlock achievements
  async checkAchievements(userId: string) {
    const [stats] = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));
    if (!stats) return [];

    // Get all locked achievements
    // In a real scenario, we might want to filter by category relevant to the action
    const lockedAchievements = await db
      .select()
      .from(achievements)
      .where(
        sql`NOT EXISTS (
          SELECT 1 FROM ${userAchievements} 
          WHERE ${userAchievements.userId} = ${userId} 
          AND ${userAchievements.achievementId} = ${achievements.id}
        )`
      );

    const unlocked = [];

    for (const achievement of lockedAchievements) {
      let isUnlocked = false;
      const reqs = JSON.parse(achievement.requirements || "{}");

      // Simple requirement checking logic based on stats
      // This can be expanded significantly
      if (
        reqs.type === "watch_count" &&
        (stats.moviesWatched || 0) >= reqs.value
      )
        isUnlocked = true;
      if (
        reqs.type === "review_count" &&
        (stats.reviewsCount || 0) >= reqs.value
      )
        isUnlocked = true;
      if (reqs.type === "list_count" && (stats.listsCount || 0) >= reqs.value)
        isUnlocked = true;
      if (
        reqs.type === "follower_count" &&
        (stats.followersCount || 0) >= reqs.value
      )
        isUnlocked = true;

      if (isUnlocked) {
        // Unlock
        await db.insert(userAchievements).values({
          userId,
          achievementId: achievement.id,
          unlockedAt: new Date(),
          progress: 100,
        });

        // Award XP for achievement
        if (achievement.xpReward) {
          await this.awardXP(
            userId,
            achievement.xpReward,
            "achievement",
            `Unlocked: ${achievement.name}`
          );
        }

        unlocked.push(achievement);
      }
    }

    return unlocked;
  }
}

export const gamificationService = new GamificationService();
