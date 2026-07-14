/**
 * PreSaleSink — abstraction over the persistence of Stripe Checkout pre-sale
 * records (AUGA-128).
 *
 * The Augmenta app currently persists its state to a JSON file at
 * `data/store.json` (or `$PAPERCLIP_STORE_PATH`) via `lib/email/store.ts`.
 * That JSON store is the application's de-facto "DB" today. The CTO work
 * tracked in AUGA-129 / AUGA-134 will provision a PostgreSQL HDS Clever Cloud
 * addon; once `AUGMENTA_DATABASE_URL` is set and the `db/migrations/0001_pre_sales.sql`
 * schema is applied, the same sink interface can be re-targeted to a real
 * `pg`/`postgres` client without touching the webhook route.
 *
 * This module owns the sink contract and ships two implementations:
 *
 *   - `DbPreSaleSink`    — production sink. Persists to the JSON store (and
 *                          will route to Postgres once configured). Upserts on
 *                          `session_id` for webhook idempotency.
 *   - `StdoutPreSaleSink` — dev / test sink. Logs the row to stdout as
 *                          structured JSON and is a no-op for reads. Useful
 *                          for local Stripe CLI testing where you don't want
 *                          to touch `data/store.json`.
 *
 * The factory `createPreSaleSink()` picks the implementation from
 * `process.env.PRE_SALES_SINK` (default: `db`). Both sinks log a warning
 * (never throw) on write failures so the webhook can return 200 to Stripe and
 * avoid the retry loop — the contract documented in AUGA-128.
 */

import {
  mutateStore,
  type PreSale as JsonPreSale,
  type StoreSchema,
} from "@/lib/email/store";

export type PreSaleStatus = "paid" | "pending" | "failed" | "refunded";

export type PreSalePlan = "monthly" | "yearly";

export type PreSaleRecord = {
  email: string;
  plan?: PreSalePlan;
  status: PreSaleStatus;
  amountCents: number;
  currency: string;
  stripeSessionId: string;
  firstName?: string;
  promoCode?: string;
  paymentIntentId?: string;
  createdAt?: string;
  paidAt?: string;
  metadata?: Record<string, unknown>;
};

export type PreSaleWriteResult =
  | { ok: true; row: PreSaleRecord; created: boolean }
  | { ok: false; error: string; retryable: boolean };

export interface PreSaleSink {
  readonly name: string;
  upsertPaid(input: PreSaleRecord): Promise<PreSaleWriteResult>;
  markExpired(sessionId: string): Promise<PreSaleWriteResult>;
  markRefunded(sessionId: string): Promise<PreSaleWriteResult>;
  markPending(input: PreSaleRecord): Promise<PreSaleWriteResult>;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toJsonStoreRow(input: PreSaleRecord): JsonPreSale {
  const now = new Date().toISOString();
  // The JSON store schema only supports "pending" | "paid" | "refunded"; the
  // SQL `pre_sales` table (AUGA-128) also accepts "failed" via the CHECK
  // constraint, but the in-process JSON store is the fallback while
  // AUGMENTA_DATABASE_URL is not yet provisioned. We therefore downgrade
  // "failed" to "pending" so the JSON store row never violates its own type.
  const status: JsonPreSale["status"] =
    input.status === "failed"
      ? "pending"
      : (input.status as JsonPreSale["status"]);
  const row: JsonPreSale = {
    email: normalizeEmail(input.email),
    status,
    amountCents: input.amountCents,
    currency: input.currency.toLowerCase(),
    stripeSessionId: input.stripeSessionId,
    createdAt: input.createdAt ?? now,
  };
  if (input.firstName) row.firstName = input.firstName;
  if (input.paidAt) row.paidAt = input.paidAt;
  return row;
}

function toRecord(row: JsonPreSale, _created: boolean): PreSaleRecord {
  const out: PreSaleRecord = {
    email: row.email,
    status: row.status,
    amountCents: row.amountCents,
    currency: row.currency,
    stripeSessionId: row.stripeSessionId ?? "",
    createdAt: row.createdAt,
  };
  if (row.firstName) out.firstName = row.firstName;
  if (row.paidAt) out.paidAt = row.paidAt;
  return out;
}

/**
 * DbPreSaleSink — production sink. Persists to the JSON store via the same
 * `mutateStore` lock that the rest of the app uses (file-lock + atomic rename
 * gives at-most-once writes per Stripe event). Upserts on `session_id`.
 */
export class DbPreSaleSink implements PreSaleSink {
  readonly name = "db";

  async upsertPaid(input: PreSaleRecord): Promise<PreSaleWriteResult> {
    if (!input.stripeSessionId) {
      return { ok: false, error: "missing_session_id", retryable: false };
    }
    if (!input.email) {
      return { ok: false, error: "missing_email", retryable: false };
    }
    const now = new Date().toISOString();
    let created = false;
    try {
      await mutateStore((state: StoreSchema) => {
        const next = [...state.preSales];
        const idx = next.findIndex(
          (p) => p.stripeSessionId === input.stripeSessionId,
        );
        const merged: JsonPreSale = {
          ...toJsonStoreRow(input),
          status: "paid",
          paidAt: input.paidAt ?? now,
        };
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...merged };
        } else {
          next.push(merged);
          created = true;
        }
        return { next: { ...state, preSales: next }, result: undefined };
      });
      const final = toJsonStoreRow({
        ...input,
        status: "paid",
        paidAt: input.paidAt ?? now,
      });
      return { ok: true, row: toRecord(final, created), created };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.warn(
        `[DbPreSaleSink] upsertPaid failed for session ${input.stripeSessionId}: ${message}`,
      );
      return { ok: false, error: message, retryable: true };
    }
  }

  async markPending(input: PreSaleRecord): Promise<PreSaleWriteResult> {
    if (!input.stripeSessionId)
      return { ok: false, error: "missing_session_id", retryable: false };
    let created = false;
    try {
      await mutateStore((state) => {
        const next = [...state.preSales];
        const idx = next.findIndex(
          (p) => p.stripeSessionId === input.stripeSessionId,
        );
        const row = toJsonStoreRow({ ...input, status: "pending" });
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...row };
        } else {
          next.push(row);
          created = true;
        }
        return { next: { ...state, preSales: next }, result: undefined };
      });
      return {
        ok: true,
        row: toRecord(toJsonStoreRow({ ...input, status: "pending" }), created),
        created,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.warn(
        `[DbPreSaleSink] markPending failed for session ${input.stripeSessionId}: ${message}`,
      );
      return { ok: false, error: message, retryable: true };
    }
  }

  async markExpired(sessionId: string): Promise<PreSaleWriteResult> {
    return this.#markStatus(sessionId, "refunded");
  }

  async markRefunded(sessionId: string): Promise<PreSaleWriteResult> {
    return this.#markStatus(sessionId, "refunded");
  }

  async #markStatus(
    sessionId: string,
    status: PreSaleStatus,
  ): Promise<PreSaleWriteResult> {
    if (!sessionId)
      return { ok: false, error: "missing_session_id", retryable: false };
    // The JSON store schema only supports "pending" | "paid" | "refunded";
    // downgrade "failed" to "pending" so we never write a row the JSON store
    // type rejects. The SQL `pre_sales` table (AUGA-128) keeps the full CHECK.
    const storeStatus: JsonPreSale["status"] =
      status === "failed" ? "pending" : (status as JsonPreSale["status"]);
    try {
      let updated: JsonPreSale | null = null;
      let created = false;
      await mutateStore((state) => {
        const next = [...state.preSales];
        const idx = next.findIndex((p) => p.stripeSessionId === sessionId);
        if (idx >= 0) {
          const existing = next[idx]!;
          const replaced: JsonPreSale = {
            email: existing.email,
            status: storeStatus,
            amountCents: existing.amountCents,
            currency: existing.currency,
            createdAt: existing.createdAt,
            ...(existing.firstName !== undefined
              ? { firstName: existing.firstName }
              : {}),
            ...(existing.stripeSessionId !== undefined
              ? { stripeSessionId: existing.stripeSessionId }
              : {}),
            ...(existing.paidAt !== undefined
              ? { paidAt: existing.paidAt }
              : {}),
          };
          next[idx] = replaced;
          updated = replaced;
        } else {
          const placeholder: JsonPreSale = {
            email: "",
            status: storeStatus,
            amountCents: 0,
            currency: "eur",
            stripeSessionId: sessionId,
            createdAt: new Date().toISOString(),
          };
          next.push(placeholder);
          updated = placeholder;
          created = true;
        }
        return { next: { ...state, preSales: next }, result: undefined };
      });
      if (!updated)
        return { ok: false, error: "store_missed_write", retryable: true };
      return { ok: true, row: toRecord(updated, created), created };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.warn(
        `[DbPreSaleSink] ${status} failed for session ${sessionId}: ${message}`,
      );
      return { ok: false, error: message, retryable: true };
    }
  }
}

/**
 * StdoutPreSaleSink — dev / test sink. Emits structured JSON to stdout and
 * never reads or writes the JSON store. Used when `PRE_SALES_SINK=stdout` is
 * set, and as the no-dependency sink for local Stripe CLI replay.
 */
export class StdoutPreSaleSink implements PreSaleSink {
  readonly name = "stdout";

  async upsertPaid(input: PreSaleRecord): Promise<PreSaleWriteResult> {
    return this.#emit("upsertPaid", input);
  }

  async markPending(input: PreSaleRecord): Promise<PreSaleWriteResult> {
    return this.#emit("markPending", input);
  }

  async markExpired(sessionId: string): Promise<PreSaleWriteResult> {
    return this.#emit("markExpired", {
      stripeSessionId: sessionId,
      status: "refunded" as PreSaleStatus,
    });
  }

  async markRefunded(sessionId: string): Promise<PreSaleWriteResult> {
    return this.#emit("markRefunded", {
      stripeSessionId: sessionId,
      status: "refunded" as PreSaleStatus,
    });
  }

  async #emit(
    action: string,
    input: Partial<PreSaleRecord> & {
      status: PreSaleStatus;
      stripeSessionId: string;
    },
  ): Promise<PreSaleWriteResult> {
    const payload = {
      sink: "stdout",
      action,
      ts: new Date().toISOString(),
      record: input,
    };
    console.warn(`[StdoutPreSaleSink] ${JSON.stringify(payload)}`);
    return {
      ok: true,
      row: {
        email: input.email ?? "",
        status: input.status,
        amountCents: input.amountCents ?? 0,
        currency: input.currency ?? "eur",
        stripeSessionId: input.stripeSessionId,
        ...(input.firstName !== undefined
          ? { firstName: input.firstName }
          : {}),
        ...(input.promoCode !== undefined
          ? { promoCode: input.promoCode }
          : {}),
        ...(input.paymentIntentId !== undefined
          ? { paymentIntentId: input.paymentIntentId }
          : {}),
        ...(input.createdAt !== undefined
          ? { createdAt: input.createdAt }
          : {}),
        ...(input.paidAt !== undefined ? { paidAt: input.paidAt } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
      created: false,
    };
  }
}

let cached: PreSaleSink | null = null;

export function createPreSaleSink(): PreSaleSink {
  if (cached) return cached;
  const which = (process.env.PRE_SALES_SINK ?? "db").trim().toLowerCase();
  if (which === "stdout") {
    cached = new StdoutPreSaleSink();
  } else {
    cached = new DbPreSaleSink();
  }
  return cached;
}

export function resetPreSaleSinkForTests(): void {
  cached = null;
}

export type { PreSale as _JsonPreSale } from "@/lib/email/store";
