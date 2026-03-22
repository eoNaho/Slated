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
import { userTitles, profileTitles } from "../db/schema/identity";

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

// ─── Standalone helpers for cross-route use ────────────────────────────────

/**
 * Grant XP and handle side-effects (level-up notification, XP title unlocks).
 */
export async function grantXp(
  userId: string,
  amount: number,
  type: string,
  description?: string,
): Promise<void> {
  if (amount <= 0) return;

  const result = await gamificationService.awardXP(userId, amount, type, description ?? type);
  if (!result) return;

  const { newXP, leveledUp, newLevel } = result;

  // Level-up notification (lazy import to avoid circular deps)
  if (leveledUp) {
    const { createNotification } = await import("../routes/notifications");
    await createNotification(
      userId,
      "achievement",
      `Level ${newLevel}!`,
      `Você chegou ao nível ${newLevel}. Continue assistindo!`,
      { level: newLevel, xp: newXP },
    ).catch(() => null);
  }

  // Auto-unlock XP-gated titles
  await checkXpTitleUnlocks(userId, newXP);
}

async function checkXpTitleUnlocks(userId: string, totalXp: number): Promise<void> {
  const alreadyHas = await db
    .select({ titleId: userTitles.titleId })
    .from(userTitles)
    .where(eq(userTitles.userId, userId));

  const hasIds = new Set(alreadyHas.map((r) => r.titleId));

  const eligible = await db
    .select()
    .from(profileTitles)
    .where(eq(profileTitles.source, "xp"));

  const toUnlock = eligible.filter(
    (t) => !hasIds.has(t.id) && t.xpRequired != null && totalXp >= t.xpRequired,
  );

  for (const title of toUnlock) {
    await db.insert(userTitles).values({ userId, titleId: title.id }).onConflictDoNothing();
    const { createNotification } = await import("../routes/notifications");
    await createNotification(
      userId,
      "achievement",
      `Título desbloqueado: ${title.name}`,
      `Você ganhou o título "${title.name}"!`,
      { titleId: title.id },
    ).catch(() => null);
  }
}

/** Grant +5 XP for creating a story. */
export async function handleStoryCreated(userId: string): Promise<void> {
  await grantXp(userId, 5, "story_created", "Criou uma story");
}

/** Grant +20 XP milestone when a story hits 10 reactions. */
export async function handleStoryReactionMilestone(
  storyOwnerId: string,
  reactionCount: number,
): Promise<void> {
  if (reactionCount === 10) {
    await grantXp(storyOwnerId, 20, "story_reactions_milestone", "10 reações em uma story");
    const { createNotification } = await import("../routes/notifications");
    await createNotification(
      storyOwnerId,
      "story_reaction",
      "Sua story bombou!",
      "Sua story recebeu 10 reações. +20 XP!",
      { reactionCount },
    ).catch(() => null);
  }
}
