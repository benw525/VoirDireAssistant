import type { User } from "@shared/schema";

export const FREE_ACCESS_EMAILS = ["benw52592@gmail.com"];

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

export async function createCheckoutSession(
  _user: User,
  _plan: "monthly" | "per_case"
): Promise<{ url: string }> {
  return {
    url: "/settings?billing=simulated&message=Stripe+is+not+connected+yet.+Connect+Stripe+to+enable+real+payments.",
  };
}

export async function createPortalSession(_user: User): Promise<{ url: string }> {
  return {
    url: "/settings?billing=simulated&message=Stripe+is+not+connected+yet.+Connect+Stripe+to+manage+your+subscription.",
  };
}
