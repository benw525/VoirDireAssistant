import Stripe from "stripe";
import type { User } from "@shared/schema";
import { storage } from "./storage";

export const FREE_ACCESS_EMAILS = ["benw52592@gmail.com"];

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

function getBaseUrl(): string {
  if (process.env.REPLIT_DEPLOYMENT_URL) return `https://${process.env.REPLIT_DEPLOYMENT_URL}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "http://localhost:5000";
}

export interface BillingStatus {
  tier: string;
  casesUsed: number;
  casesPurchased: number;
  casesRemaining: number | null;
  isFreeAccess: boolean;
  hasActiveSubscription: boolean;
  canCreateCase: boolean;
  upgradeReason?: string;
}

export function canCreateCase(user: User): { allowed: boolean; reason?: string } {
  if (FREE_ACCESS_EMAILS.includes(user.email.toLowerCase())) {
    return { allowed: true };
  }

  if (user.subscriptionTier === "monthly" && user.stripeSubscriptionId) {
    return { allowed: true };
  }

  if (user.subscriptionTier === "free" && user.casesUsed < 1) {
    return { allowed: true };
  }

  if (user.subscriptionTier === "per_case" && user.casesUsed < (1 + user.casesPurchased)) {
    return { allowed: true };
  }

  if (user.subscriptionTier === "free" && user.casesUsed >= 1) {
    return {
      allowed: false,
      reason: "Your free case has been used. Subscribe for $20/month unlimited access, or purchase individual cases for $20 each.",
    };
  }

  return {
    allowed: false,
    reason: "You've used all your purchased cases. Buy another case for $20 or subscribe for $20/month unlimited access.",
  };
}

export function getUserBillingInfo(user: User): BillingStatus {
  const isFreeAccess = FREE_ACCESS_EMAILS.includes(user.email.toLowerCase());
  const hasActiveSubscription = user.subscriptionTier === "monthly" && !!user.stripeSubscriptionId;

  let casesRemaining: number | null = null;
  if (isFreeAccess || hasActiveSubscription) {
    casesRemaining = null;
  } else if (user.subscriptionTier === "per_case") {
    casesRemaining = Math.max(0, (1 + user.casesPurchased) - user.casesUsed);
  } else {
    casesRemaining = Math.max(0, 1 - user.casesUsed);
  }

  const checkResult = canCreateCase(user);

  return {
    tier: isFreeAccess ? "unlimited" : user.subscriptionTier,
    casesUsed: user.casesUsed,
    casesPurchased: user.casesPurchased,
    casesRemaining,
    isFreeAccess,
    hasActiveSubscription,
    canCreateCase: checkResult.allowed,
    upgradeReason: checkResult.reason,
  };
}

async function getOrCreateStripeCustomer(user: User): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });

  await storage.updateUser(user.id, { stripeCustomerId: customer.id } as any);
  return customer.id;
}

async function findOrCreatePrice(plan: "monthly" | "per_case"): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");

  const lookupKey = plan === "monthly" ? "vda_monthly_20" : "vda_per_case_20";

  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const product = await stripe.products.create({
    name: plan === "monthly" ? "Voir Dire Analyst — Monthly Unlimited" : "Voir Dire Analyst — Single Case",
    description: plan === "monthly"
      ? "Unlimited case creation for $20/month"
      : "One additional case credit for $20",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 2000,
    currency: "usd",
    lookup_key: lookupKey,
    ...(plan === "monthly"
      ? { recurring: { interval: "month" as const } }
      : {}),
  });

  return price.id;
}

export async function createCheckoutSession(
  user: User,
  plan: "monthly" | "per_case"
): Promise<{ url: string }> {
  if (!stripe) {
    return {
      url: "/app?billing=error&message=Stripe+is+not+configured",
    };
  }

  const customerId = await getOrCreateStripeCustomer(user);
  const priceId = await findOrCreatePrice(plan);
  const baseUrl = getBaseUrl();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: plan === "monthly" ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/app?billing=success&plan=${plan}`,
    cancel_url: `${baseUrl}/app?billing=cancelled`,
    metadata: {
      userId: user.id,
      plan,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return { url: session.url };
}

export async function createPortalSession(user: User): Promise<{ url: string }> {
  if (!stripe) {
    return {
      url: "/app?billing=error&message=Stripe+is+not+configured",
    };
  }

  const customerId = await getOrCreateStripeCustomer(user);
  const baseUrl = getBaseUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/app`,
  });

  return { url: session.url };
}

export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  if (!stripe) throw new Error("Stripe is not configured");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured — cannot verify webhook signature");
  }

  if (!signature) {
    throw new Error("Missing stripe-signature header");
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  console.log(`Stripe webhook: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;

      if (!userId || !plan) {
        console.warn("Webhook checkout.session.completed missing metadata", session.id);
        break;
      }

      if (plan === "monthly" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        await storage.updateUser(userId, {
          subscriptionTier: "monthly",
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
        } as any);
        console.log(`User ${userId} subscribed to monthly plan`);
      } else if (plan === "per_case") {
        const user = await storage.getUserById(userId);
        if (user) {
          const newTier = user.subscriptionTier === "monthly" ? "monthly" : "per_case";
          await storage.updateUser(userId, {
            subscriptionTier: newTier,
            casesPurchased: (user.casesPurchased || 0) + 1,
            stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
          } as any);
          console.log(`User ${userId} purchased a case credit (total: ${(user.casesPurchased || 0) + 1})`);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

      if (subscription.status === "active" || subscription.status === "trialing") {
        break;
      }

      const users = await findUserByStripeCustomer(customerId);
      if (users) {
        await storage.updateUser(users.id, {
          subscriptionTier: "free",
          stripeSubscriptionId: null,
        } as any);
        console.log(`User ${users.id} subscription status changed to ${subscription.status}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

      const users = await findUserByStripeCustomer(customerId);
      if (users) {
        const newTier = (users.casesPurchased || 0) > 0 ? "per_case" : "free";
        await storage.updateUser(users.id, {
          subscriptionTier: newTier,
          stripeSubscriptionId: null,
        } as any);
        console.log(`User ${users.id} subscription deleted, reverted to ${newTier}`);
      }
      break;
    }
  }
}

async function findUserByStripeCustomer(customerId: string): Promise<User | undefined> {
  const { eq } = await import("drizzle-orm");
  const { users } = await import("@shared/schema");
  const { db } = await import("./db");
  const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
  return user;
}
