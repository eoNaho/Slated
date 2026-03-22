import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

export class StripeService {
  // Create checkout session for subscription
  static async createCheckoutSession(
    userId: string,
    priceId: string,
    customerEmail: string,
    plan?: string,
  ): Promise<{ url: string | null; sessionId: string }> {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/settings/subscription?canceled=true`,
      metadata: {
        userId,
        ...(plan ? { plan } : {}),
      },
    });

    return { url: session.url, sessionId: session.id };
  }

  // Create customer portal session
  static async createPortalSession(
    customerId: string
  ): Promise<{ url: string }> {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/settings/subscription`,
    });

    return { url: session.url };
  }

  // Cancel subscription
  static async cancelSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Resume subscription
  static async resumeSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // Get subscription
  static async getSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  // Verify webhook signature
  static constructEvent(payload: string, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  }

  // Create or get customer
  static async getOrCreateCustomer(
    email: string,
    userId: string
  ): Promise<string> {
    // Search for existing customer
    const existing = await stripe.customers.list({ email, limit: 1 });

    if (existing.data.length > 0) {
      return existing.data[0].id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    return customer.id;
  }
}

export { stripe };
