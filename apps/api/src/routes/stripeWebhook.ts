import { Elysia, t } from "elysia";
import { db, user as userTable, subscriptions, payments, eq, and } from "../db";
import { notifications } from "../db/schema/security";
import { profileTitles, userTitles } from "../db/schema/identity";
import { StripeService, stripe } from "../services/stripe";
import { betterAuthPlugin } from "../lib/auth";
import { inArray } from "drizzle-orm";

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
          body.plan,
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
      body: t.Object({
        priceId: t.String(),
        plan: t.Optional(t.Union([t.Literal("pro"), t.Literal("ultra")])),
      }),
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
        const plan = session.metadata?.plan as "pro" | "ultra" | undefined;
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

          // Auto-unlock plan-gated titles for the purchased tier
          if (plan) {
            const plansToUnlock = plan === "ultra" ? ["pro", "ultra"] : ["pro"];
            const planTitles = await db
              .select({ id: profileTitles.id })
              .from(profileTitles)
              .where(
                and(
                  eq(profileTitles.source, "plan"),
                  inArray(profileTitles.minPlan, plansToUnlock),
                ),
              );

            if (planTitles.length > 0) {
              await db
                .insert(userTitles)
                .values(
                  planTitles.map((t) => ({ userId, titleId: t.id })),
                )
                .onConflictDoNothing();
            }
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

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, customerId))
          .limit(1);

        if (sub) {
          const newStatus = subscription.status === "active" ? "active"
            : subscription.status === "past_due" ? "past_due"
            : sub.status;

          await db
            .update(subscriptions)
            .set({
              status: newStatus,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.stripeCustomerId, customerId));

          if (subscription.status === "active") {
            await db
              .update(userTable)
              .set({ isPremium: true })
              .where(eq(userTable.id, sub.userId));
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const attemptCount = invoice.attempt_count as number;

        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, customerId))
          .limit(1);

        if (sub) {
          await db
            .update(subscriptions)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(subscriptions.stripeCustomerId, customerId));

          await db.insert(notifications).values({
            userId: sub.userId,
            type: "system",
            title: "Pagamento não realizado",
            message: `Sua tentativa de cobrança falhou (tentativa ${attemptCount}). Por favor, atualize seu método de pagamento.`,
            data: JSON.stringify({ type: "payment_failed", attemptCount, invoiceId: invoice.id }),
          });

          // After 3 failed attempts, revoke premium access
          if (attemptCount >= 3) {
            await db
              .update(userTable)
              .set({ isPremium: false })
              .where(eq(userTable.id, sub.userId));
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        const [sub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, customerId))
          .limit(1);

        if (sub) {
          await db
            .update(subscriptions)
            .set({ status: "active", updatedAt: new Date() })
            .where(eq(subscriptions.stripeCustomerId, customerId));

          await db
            .update(userTable)
            .set({ isPremium: true })
            .where(eq(userTable.id, sub.userId));

          if (invoice.amount_paid > 0) {
            await db.insert(payments).values({
              userId: sub.userId,
              subscriptionId: sub.id,
              amount: (invoice.amount_paid / 100).toFixed(2),
              currency: invoice.currency?.toUpperCase() ?? "USD",
              status: "completed",
              stripePaymentIntentId: invoice.payment_intent,
            });
          }
        }
        break;
      }

      case "customer.subscription.paused": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        await db
          .update(subscriptions)
          .set({ status: "paused", updatedAt: new Date() })
          .where(eq(subscriptions.stripeCustomerId, customerId));
        break;
      }
    }

    return { received: true };
  });
