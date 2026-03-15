import { Elysia, t } from "elysia";
import { db, plans, subscriptions, eq, and } from "../db";
import { betterAuthPlugin } from "../lib/auth";

export const plansRoutes = new Elysia({ prefix: "/plans", tags: ["Payments"] })
  .use(betterAuthPlugin)

  // List active plans
  .get("/", async () => {
    const activePlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(plans.priceMonthly);

    return { data: activePlans };
  })

  // Get current user subscription
  .get("/my-subscription", async (ctx: any) => {
    const { user } = ctx;

    const [subscription] = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    if (!subscription) {
      return { data: null };
    }

    return {
      data: {
        ...subscription.subscription,
        plan: subscription.plan,
      },
    };
  }, { requireAuth: true })

  // Subscribe (Mock implementation - would integrate Stripe here)
  .post(
    "/subscribe",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      const { planId, interval } = body;

      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, planId))
        .limit(1);
      if (!plan) {
        set.status = 404;
        return { error: "Plan not found" };
      }

      // Mock subscription creation
      const [sub] = await db
        .insert(subscriptions)
        .values({
          userId: user.id,
          planId,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ),
        })
        .returning();

      return { success: true, data: sub };
    },
    {
      requireAuth: true,
      body: t.Object({
        planId: t.String(),
        interval: t.Union([t.Literal("month"), t.Literal("year")]),
      }),
    }
  );
