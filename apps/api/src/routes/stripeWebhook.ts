import { Elysia, t } from "elysia";
import { db, user as userTable, subscriptions, eq, and } from "../db";
import { StripeService, stripe } from "../services/stripe";
import { betterAuthPlugin } from "../lib/auth";

export const stripeRoutes = new Elysia({
  prefix: "/stripe",
  tags: ["Payments"],
})
  .use(betterAuthPlugin)

  // Create checkout session
  .post(
    "/checkout",
    async (ctx: any) => {
      const { user, body, set } = ctx;

      const [userData] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, user.id));
      if (!userData?.email) {
        set.status = 400;
        return { error: "User email required" };
      }

      try {
        const { url, sessionId } = await StripeService.createCheckoutSession(
          user.id,
          body.priceId,
          userData.email,
        );
        return { url, sessionId };
      } catch (e: any) {
        set.status = 500;
        return {
          error: "Failed to create checkout session",
          details: e.message,
        };
      }
    },
    {
      requireAuth: true,
      body: t.Object({ priceId: t.String() }),
    },
  )

  // Create portal session (manage subscription)
  .post(
    "/portal",
    async (ctx: any) => {
      const { user, set } = ctx;

      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
        .limit(1);

      if (!sub?.stripeCustomerId) {
        set.status = 400;
        return { error: "No active subscription found" };
      }

      try {
        const { url } = await StripeService.createPortalSession(
          sub.stripeCustomerId,
        );
        return { url };
      } catch (e: any) {
        set.status = 500;
        return { error: "Failed to create portal session", details: e.message };
      }
    },
    { requireAuth: true },
  )

  // Webhook handler (no auth — uses Stripe signature)
  .post("/webhook", async ({ request, set }: any) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      set.status = 400;
      return { error: "Missing signature" };
    }

    let event;
    try {
      const body = await request.text();
      event = StripeService.constructEvent(body, signature);
    } catch (e: any) {
      set.status = 400;
      return { error: `Webhook error: ${e.message}` };
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;

        if (userId) {
          await db
            .update(userTable)
            .set({ isPremium: true })
            .where(eq(userTable.id, userId));

          const existingSub = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .limit(1);

          if (existingSub.length === 0) {
            await db.insert(subscriptions).values({
              userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: session.subscription,
              status: "active",
            });
          } else {
            await db
              .update(subscriptions)
              .set({
                stripeCustomerId: customerId,
                stripeSubscriptionId: session.subscription,
                status: "active",
              })
              .where(eq(subscriptions.userId, userId));
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, customerId))
          .limit(1);

        if (sub) {
          await db
            .update(userTable)
            .set({ isPremium: false })
            .where(eq(userTable.id, sub.userId));

          await db
            .update(subscriptions)
            .set({ status: "canceled" })
            .where(eq(subscriptions.stripeCustomerId, customerId));
        }
        break;
      }
    }

    return { received: true };
  });
