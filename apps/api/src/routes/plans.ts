import { Elysia } from "elysia";
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

