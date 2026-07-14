import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  createPreSaleSink,
  type PreSaleRecord,
} from "@/lib/email/pre-sale-sink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "missing_signature" },
      { status: 400 },
    );
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "webhook_secret_not_configured" },
      { status: 500 },
    );
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_signature",
        reason: err instanceof Error ? err.message : "unknown",
      },
      { status: 400 },
    );
  }

  const result = await handleEvent(event);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}

async function handleEvent(event: Stripe.Event): Promise<ActionResult> {
  const sink = createPreSaleSink();
  switch (event.type) {
    case "checkout.session.completed": {
      const out = await sink.upsertPaid(
        buildRecord(event.data.object as Stripe.Checkout.Session),
      );
      if (!out.ok) {
        console.warn(
          `[stripe-webhook] sink_error on upsertPaid: ${out.error} (acknowledged to avoid retry loop)`,
        );
        return { ok: true, updated: 0 };
      }
      return { ok: true, updated: out.created ? 1 : 0 };
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.id) return { ok: true, updated: 0 };
      const out = await sink.markExpired(session.id);
      if (!out.ok) {
        console.warn(
          `[stripe-webhook] sink_error on markExpired: ${out.error} (acknowledged to avoid retry loop)`,
        );
        return { ok: true, updated: 0 };
      }
      return { ok: true, updated: out.created ? 1 : 0 };
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const sessionId = extractSessionIdFromCharge(charge);
      if (!sessionId) return { ok: true, updated: 0 };
      const out = await sink.markRefunded(sessionId);
      if (!out.ok) {
        console.warn(
          `[stripe-webhook] sink_error on markRefunded: ${out.error} (acknowledged to avoid retry loop)`,
        );
        return { ok: true, updated: 0 };
      }
      return { ok: true, updated: out.created ? 1 : 0 };
    }
    default:
      return { ok: true, updated: 0 };
  }
}

function buildRecord(session: Stripe.Checkout.Session): PreSaleRecord {
  const email = (
    session.customer_details?.email ??
    session.metadata?.email ??
    ""
  )
    .trim()
    .toLowerCase();
  const metadata = (session.metadata ?? {}) as Record<
    string,
    string | undefined
  >;
  const firstName = metadata.firstName?.trim();
  const plan = (metadata.plan === "yearly" ? "yearly" : "monthly") as
    | "monthly"
    | "yearly";
  const promo = metadata.promo?.trim() || undefined;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : undefined;
  return {
    email,
    plan,
    status: "paid",
    amountCents: session.amount_total ?? 0,
    currency: (session.currency ?? "eur").toLowerCase(),
    stripeSessionId: session.id,
    ...(firstName ? { firstName } : {}),
    ...(promo ? { promoCode: promo } : {}),
    ...(paymentIntentId ? { paymentIntentId } : {}),
    ...(metadata ? { metadata: stripEmpty(metadata) } : {}),
    paidAt: new Date().toISOString(),
  };
}

function stripEmpty(
  input: Record<string, string | undefined>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

function extractSessionIdFromCharge(charge: Stripe.Charge): string | null {
  const pi = charge.payment_intent;
  if (typeof pi === "string") return pi;
  if (
    pi &&
    typeof pi === "object" &&
    "id" in pi &&
    typeof (pi as { id: string }).id === "string"
  ) {
    return (pi as { id: string }).id;
  }
  return null;
}
