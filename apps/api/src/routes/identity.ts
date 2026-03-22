import { Elysia, t } from "elysia";
import {
  db,
  user as userTable,
  profileFrames,
  profileTitles,
  userTitles,
  userIdentityPerks,
  userSettings,
  subscriptions,
  plans,
  eq,
  and,
  sql,
} from "../db";
import { betterAuthPlugin } from "../lib/auth";
import {
  getUserPlanTier,
  checkFeatureForTier,
  invalidateFlagsCache,
} from "../lib/feature-gate";

// Helper: check if a plan tier meets the minimum plan requirement
function meetsPlan(userTier: string, minPlan: string | null): boolean {
  if (!minPlan || minPlan === "free") return true;
  if (minPlan === "pro") return userTier === "pro" || userTier === "ultra";
  if (minPlan === "ultra") return userTier === "ultra";
  return false;
}

export const identityRoutes = new Elysia({
  prefix: "/identity",
  tags: ["Identity"],
}).use(betterAuthPlugin)

  // ─── GET /identity/me ─────────────────────────────────────────────
  // Returns the current user's active identity configuration
  .get(
    "/me",
    async (ctx: any) => {
      const { user } = ctx;

      const [perks] = await db
        .select({
          userId: userIdentityPerks.userId,
          frameId: userIdentityPerks.frameId,
          activeTitleId: userIdentityPerks.activeTitleId,
          badgeEnabled: userIdentityPerks.badgeEnabled,
          verified: userIdentityPerks.verified,
          frame: {
            id: profileFrames.id,
            name: profileFrames.name,
            slug: profileFrames.slug,
            color: profileFrames.color,
            isAnimated: profileFrames.isAnimated,
          },
          title: {
            id: profileTitles.id,
            name: profileTitles.name,
            slug: profileTitles.slug,
            bgColor: profileTitles.bgColor,
            textColor: profileTitles.textColor,
          },
        })
        .from(userIdentityPerks)
        .leftJoin(profileFrames, eq(userIdentityPerks.frameId, profileFrames.id))
        .leftJoin(profileTitles, eq(userIdentityPerks.activeTitleId, profileTitles.id))
        .where(eq(userIdentityPerks.userId, user.id));

      const [settings] = await db
        .select({
          accentColor: userSettings.accentColor,
          profileTheme: userSettings.profileTheme,
          showcasedBadges: userSettings.showcasedBadges,
        })
        .from(userSettings)
        .where(eq(userSettings.userId, user.id));

      return {
        data: {
          perks: perks ?? null,
          accentColor: settings?.accentColor ?? null,
          profileTheme: settings?.profileTheme ?? null,
          showcasedBadges: settings?.showcasedBadges
            ? JSON.parse(settings.showcasedBadges)
            : [],
        },
      };
    },
    { requireAuth: true }
  )

  // ─── GET /identity/frames ──────────────────────────────────────────
  // Returns all frames with isUnlocked flag for the current user's plan
  .get(
    "/frames",
    async (ctx: any) => {
      const { user } = ctx;
      const tier = await getUserPlanTier(user.id);
      const canUseFrames = await checkFeatureForTier(tier, "profile_frames");

      const frames = await db.select().from(profileFrames);

      return {
        data: frames.map((f) => ({
          ...f,
          isUnlocked: canUseFrames && meetsPlan(tier, f.minPlan),
        })),
      };
    },
    { requireAuth: true }
  )

  // ─── GET /identity/titles ──────────────────────────────────────────
  // Returns all titles with isUnlocked flag
  .get(
    "/titles",
    async (ctx: any) => {
      const { user } = ctx;
      const tier = await getUserPlanTier(user.id);

      // Get titles the user has unlocked
      const unlocked = await db
        .select({ titleId: userTitles.titleId })
        .from(userTitles)
        .where(eq(userTitles.userId, user.id));

      const unlockedIds = new Set(unlocked.map((u) => u.titleId));

      const [userStats] = await db
        .select({ xp: sql<number>`xp` })
        .from(sql`user_stats`)
        .where(sql`user_id = ${user.id}`)
        .limit(1);

      const userXP = userStats?.xp ?? 0;

      const titles = await db.select().from(profileTitles);

      return {
        data: titles.map((title) => {
          let isUnlocked = unlockedIds.has(title.id);

          // Auto-check eligibility for plan-sourced titles not yet unlocked
          if (!isUnlocked) {
            if (title.source === "plan" && title.minPlan) {
              isUnlocked = meetsPlan(tier, title.minPlan);
            } else if (title.source === "xp" && title.xpRequired) {
              const meetsMinPlan = !title.minPlan || meetsPlan(tier, title.minPlan);
              isUnlocked = meetsMinPlan && userXP >= title.xpRequired;
            }
          }

          return { ...title, isUnlocked };
        }),
      };
    },
    { requireAuth: true }
  )

  // ─── PATCH /identity/frame ─────────────────────────────────────────
  // Set the active frame
  .patch(
    "/frame",
    async (ctx: any) => {
      const { user, body, set } = ctx;
      const tier = await getUserPlanTier(user.id);

      if (body.frameId) {
        const canUseFrames = await checkFeatureForTier(tier, "profile_frames");
        if (!canUseFrames) {
          set.status = 403;
          return { error: "profile_frames feature requires Pro or Ultra plan" };
        }

        const [frame] = await db
          .select()
          .from(profileFrames)
          .where(eq(profileFrames.id, body.frameId));

        if (!frame) {
          set.status = 404;
          return { error: "Frame not found" };
        }

        if (!meetsPlan(tier, frame.minPlan)) {
          set.status = 403;
          return { error: `Frame '${frame.name}' requires ${frame.minPlan} plan` };
        }
      }

      const [perks] = await db
        .insert(userIdentityPerks)
        .values({
          userId: user.id,
          frameId: body.frameId ?? null,
        })
        .onConflictDoUpdate({
          target: userIdentityPerks.userId,
          set: { frameId: body.frameId ?? null, updatedAt: new Date() },
        })
        .returning();

      return { data: perks };
    },
    {
      requireAuth: true,
      body: t.Object({ frameId: t.Nullable(t.String()) }),
    }
  )

  // ─── PATCH /identity/title ─────────────────────────────────────────
  // Activate an already-unlocked title
  .patch(
    "/title",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      if (body.titleId) {
        const tier = await getUserPlanTier(user.id);

        const [title] = await db
          .select()
          .from(profileTitles)
          .where(eq(profileTitles.id, body.titleId));

        if (!title) {
          set.status = 404;
          return { error: "Title not found" };
        }

        // Check if user has unlocked this title
        const [unlocked] = await db
          .select()
          .from(userTitles)
          .where(
            and(
              eq(userTitles.userId, user.id),
              eq(userTitles.titleId, body.titleId)
            )
          );

        // Auto-grant plan titles if eligible
        if (!unlocked && title.source === "plan" && title.minPlan) {
          if (!meetsPlan(tier, title.minPlan)) {
            set.status = 403;
            return {
              error: `Title '${title.name}' requires ${title.minPlan} plan`,
            };
          }
          // Auto-unlock
          await db
            .insert(userTitles)
            .values({ userId: user.id, titleId: body.titleId })
            .onConflictDoNothing();
        } else if (!unlocked) {
          set.status = 403;
          return { error: "Title not unlocked yet" };
        }
      }

      const [perks] = await db
        .insert(userIdentityPerks)
        .values({
          userId: user.id,
          activeTitleId: body.titleId ?? null,
        })
        .onConflictDoUpdate({
          target: userIdentityPerks.userId,
          set: { activeTitleId: body.titleId ?? null, updatedAt: new Date() },
        })
        .returning();

      return { data: perks };
    },
    {
      requireAuth: true,
      body: t.Object({ titleId: t.Nullable(t.String()) }),
    }
  )

  // ─── PATCH /identity/appearance ────────────────────────────────────
  // Update accent color, profile theme, showcased badges
  .patch(
    "/appearance",
    async (ctx: any) => {
      const { user, body, set } = ctx;
      const tier = await getUserPlanTier(user.id);

      if (body.profileTheme !== undefined) {
        const canUseThemes = await checkFeatureForTier(tier, "custom_themes");
        if (!canUseThemes) {
          set.status = 403;
          return { error: "custom_themes feature requires Pro or Ultra plan" };
        }
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (body.accentColor !== undefined) updateData.accentColor = body.accentColor;
      if (body.profileTheme !== undefined) updateData.profileTheme = body.profileTheme;
      if (body.showcasedBadges !== undefined)
        updateData.showcasedBadges = JSON.stringify(body.showcasedBadges);

      const [updated] = await db
        .insert(userSettings)
        .values({ userId: user.id, ...updateData })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: updateData,
        })
        .returning();

      return { data: updated };
    },
    {
      requireAuth: true,
      body: t.Object({
        accentColor: t.Optional(t.Nullable(t.String())),
        profileTheme: t.Optional(t.Nullable(t.String())),
        showcasedBadges: t.Optional(t.Array(t.String())),
      }),
    }
  )

  // ─── POST /identity/titles/:id/unlock ──────────────────────────────
  // Unlock a title (XP/plan/achievement check)
  .post(
    "/titles/:id/unlock",
    async (ctx: any) => {
      const { user, params, set } = ctx;
      const tier = await getUserPlanTier(user.id);

      const [title] = await db
        .select()
        .from(profileTitles)
        .where(eq(profileTitles.id, params.id));

      if (!title) {
        set.status = 404;
        return { error: "Title not found" };
      }

      // Check already unlocked
      const [existing] = await db
        .select()
        .from(userTitles)
        .where(
          and(eq(userTitles.userId, user.id), eq(userTitles.titleId, params.id))
        );

      if (existing) return { data: existing, message: "Already unlocked" };

      // Validate eligibility
      if (title.source === "plan") {
        if (!title.minPlan || !meetsPlan(tier, title.minPlan)) {
          set.status = 403;
          return { error: `Requires ${title.minPlan ?? "pro"} plan` };
        }
      } else if (title.source === "xp") {
        const meetsMinPlan = !title.minPlan || meetsPlan(tier, title.minPlan);
        if (!meetsMinPlan) {
          set.status = 403;
          return { error: `Requires ${title.minPlan} plan` };
        }
        const [stats] = await db
          .select({ xp: sql<number>`xp` })
          .from(sql`user_stats`)
          .where(sql`user_id = ${user.id}`)
          .limit(1);

        if ((stats?.xp ?? 0) < (title.xpRequired ?? 0)) {
          set.status = 403;
          return {
            error: `Requires ${title.xpRequired} XP (you have ${stats?.xp ?? 0})`,
          };
        }
      } else if (title.source === "achievement") {
        if (!title.achievementId) {
          set.status = 403;
          return { error: "Achievement requirement not configured" };
        }
        const [achievedRow] = await db
          .select()
          .from(sql`user_achievements`)
          .where(
            sql`user_id = ${user.id} AND achievement_id = ${title.achievementId} AND unlocked_at IS NOT NULL`
          )
          .limit(1);

        if (!achievedRow) {
          set.status = 403;
          return { error: "Required achievement not unlocked" };
        }
      }

      const [unlocked] = await db
        .insert(userTitles)
        .values({ userId: user.id, titleId: params.id })
        .returning();

      return { data: unlocked };
    },
    {
      requireAuth: true,
      params: t.Object({ id: t.String() }),
    }
  )

  // ─── GET /identity/:username ────────────────────────────────────────
  // Public identity info for a user profile (no auth required)
  .get(
    "/:username",
    async ({ params, set }: any) => {
      const [profile] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(
          and(
            eq(userTable.username, params.username),
            eq(userTable.status, "active")
          )
        )
        .limit(1);

      if (!profile) {
        set.status = 404;
        return { error: "User not found" };
      }

      const [perks] = await db
        .select({
          frameId: userIdentityPerks.frameId,
          activeTitleId: userIdentityPerks.activeTitleId,
          badgeEnabled: userIdentityPerks.badgeEnabled,
          verified: userIdentityPerks.verified,
          frame: {
            id: profileFrames.id,
            name: profileFrames.name,
            slug: profileFrames.slug,
            color: profileFrames.color,
            isAnimated: profileFrames.isAnimated,
          },
          title: {
            id: profileTitles.id,
            name: profileTitles.name,
            slug: profileTitles.slug,
            bgColor: profileTitles.bgColor,
            textColor: profileTitles.textColor,
          },
        })
        .from(userIdentityPerks)
        .leftJoin(profileFrames, eq(userIdentityPerks.frameId, profileFrames.id))
        .leftJoin(
          profileTitles,
          eq(userIdentityPerks.activeTitleId, profileTitles.id)
        )
        .where(eq(userIdentityPerks.userId, profile.id));

      const [settings] = await db
        .select({
          accentColor: userSettings.accentColor,
          profileTheme: userSettings.profileTheme,
          showcasedBadges: userSettings.showcasedBadges,
        })
        .from(userSettings)
        .where(eq(userSettings.userId, profile.id));

      return {
        data: {
          perks: perks ?? null,
          accentColor: settings?.accentColor ?? null,
          profileTheme: settings?.profileTheme ?? null,
          showcasedBadges: settings?.showcasedBadges
            ? JSON.parse(settings.showcasedBadges)
            : [],
        },
      };
    },
    { params: t.Object({ username: t.String() }) }
  );
