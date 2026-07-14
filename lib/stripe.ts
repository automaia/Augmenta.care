import Stripe from "stripe";

let cached: Stripe | null = null;

export type StripeMode = "live" | "test" | "missing";

export function getStripeMode(): StripeMode {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return "missing";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "missing";
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  cached = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
  return cached;
}

export type PreVentePlan = "monthly" | "yearly";

export const PRE_VENTE_PRICES: Record<
  PreVentePlan,
  { amountCents: number; label: string; mode: "subscription" | "payment" }
> = {
  monthly: {
    amountCents: 2900,
    label: "Augmenta — Fondateur mensuel",
    mode: "subscription",
  },
  yearly: {
    amountCents: 29000,
    label: "Augmenta — Fondateur annuel",
    mode: "payment",
  },
};

export function getPriceIdForPlan(plan: PreVentePlan): string | null {
  if (plan === "monthly") return process.env.STRIPE_PRICE_MONTHLY ?? null;
  if (plan === "yearly") return process.env.STRIPE_PRICE_YEARLY ?? null;
  return null;
}

export function isStripeConfigured(): boolean {
  return (
    getStripeMode() !== "missing" &&
    Boolean(getPriceIdForPlan("monthly")) &&
    Boolean(getPriceIdForPlan("yearly"))
  );
}

export const FOUNDING_PROMO_CODE = "FOUNDING20";
