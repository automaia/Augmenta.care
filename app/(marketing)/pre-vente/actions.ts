"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  FOUNDING_PROMO_CODE,
  getPriceIdForPlan,
  getStripe,
  getStripeMode,
  isStripeConfigured,
  PRE_VENTE_PRICES,
  type PreVentePlan,
} from "@/lib/stripe";
import { mutateStore, type PreSale } from "@/lib/email/store";

export type CheckoutResult =
  | { ok: true; url: string; sessionId: string; testMode: boolean }
  | {
      ok: false;
      error:
        | "stripe_not_configured"
        | "invalid_plan"
        | "invalid_promo"
        | "stripe_error";
      reason: string;
    };

function isPreVentePlan(
  input: FormDataEntryValue | null,
): input is PreVentePlan {
  return input === "monthly" || input === "yearly";
}

function normalizePromo(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

function isEmailValid(input: FormDataEntryValue | null): input is string {
  return (
    typeof input === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
  );
}

export async function createCheckoutSession(
  formData: FormData,
): Promise<CheckoutResult> {
  const planRaw = formData.get("plan");
  const emailRaw = formData.get("email");
  const firstNameRaw = formData.get("firstName");
  const promoRaw = formData.get("promo");

  if (!isPreVentePlan(planRaw)) {
    return {
      ok: false,
      error: "invalid_plan",
      reason: "Plan must be 'monthly' or 'yearly'",
    };
  }
  if (!isEmailValid(emailRaw)) {
    return {
      ok: false,
      error: "invalid_promo",
      reason: "A valid email is required to start checkout",
    };
  }

  const email = emailRaw.trim().toLowerCase();
  const firstName =
    typeof firstNameRaw === "string" && firstNameRaw.trim().length > 0
      ? firstNameRaw.trim()
      : undefined;
  const promo = normalizePromo(promoRaw);

  if (promo && promo !== FOUNDING_PROMO_CODE) {
    return {
      ok: false,
      error: "invalid_promo",
      reason: `Code promo inconnu : ${promo}`,
    };
  }

  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: "stripe_not_configured",
      reason:
        "Stripe n'est pas encore configuré côté serveur. Renseigne STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY et STRIPE_PRICE_YEARLY dans .env.",
    };
  }

  const priceId = getPriceIdForPlan(planRaw);
  if (!priceId) {
    return {
      ok: false,
      error: "stripe_not_configured",
      reason: `Prix manquant pour le plan ${planRaw}`,
    };
  }

  const plan = PRE_VENTE_PRICES[planRaw];
  const mode = getStripeMode();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.augmenta.care";

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: plan.mode,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      ...(promo ? { discounts: [{ coupon: await resolveCoupon(promo) }] } : {}),
      success_url: `${origin}/pre-vente/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pre-vente?cancelled=1`,
      metadata: {
        plan: planRaw,
        email,
        firstName: firstName ?? "",
        promo: promo ?? "",
      },
    });

    if (!session.url) {
      return {
        ok: false,
        error: "stripe_error",
        reason: "Stripe n'a pas renvoyé d'URL de checkout",
      };
    }

    const pendingPreSale: PreSale = {
      email,
      status: "pending",
      amountCents: plan.amountCents,
      currency: "eur",
      stripeSessionId: session.id,
      createdAt: new Date().toISOString(),
      ...(firstName ? { firstName } : {}),
    };

    await mutateStore((state) => {
      const existingIndex = state.preSales.findIndex(
        (p) => p.stripeSessionId === session.id,
      );
      const next = [...state.preSales];
      if (existingIndex >= 0) {
        next[existingIndex] = pendingPreSale;
      } else {
        next.push(pendingPreSale);
      }
      return { next: { ...state, preSales: next }, result: undefined };
    });

    revalidatePath("/pre-vente");
    return {
      ok: true,
      url: session.url,
      sessionId: session.id,
      testMode: mode === "test",
    };
  } catch (err) {
    return {
      ok: false,
      error: "stripe_error",
      reason: err instanceof Error ? err.message : "Erreur Stripe inconnue",
    };
  }
}

async function resolveCoupon(promoCode: string): Promise<string> {
  if (promoCode === FOUNDING_PROMO_CODE) {
    const existing = await getStripe().promotionCodes.list({
      code: FOUNDING_PROMO_CODE,
      limit: 1,
    });
    if (existing.data[0]) return existing.data[0].id;
  }
  const promotionCodes = await getStripe().promotionCodes.list({
    code: promoCode,
    limit: 1,
  });
  if (promotionCodes.data[0]) return promotionCodes.data[0].id;
  throw new Error(`Code promo ${promoCode} introuvable dans Stripe`);
}

export async function redirectToCheckout(formData: FormData): Promise<void> {
  const result = await createCheckoutSession(formData);
  if (!result.ok) {
    const search = new URLSearchParams({
      error: result.error,
      reason: result.reason,
    });
    redirect(`/pre-vente?${search.toString()}`);
  }
  redirect(result.url);
}
