-- Augmenta — pre_sales table (AUGA-128)
--
-- Stores Stripe Checkout pre-sale records produced by the
-- /api/stripe/webhook route and consumed by:
--   - app/(marketing)/pre-vente/actions.ts  (creates pending rows)
--   - scripts/landing-signups-export/query.sql  (excludes paid emails)
--   - app/api/admin/pre-vente/route.ts  (admin dashboard summary)
--
-- This file is the canonical schema artifact for the production Augmenta
-- PostgreSQL HDS Clever Cloud addon. Apply with:
--
--   psql "$AUGMENTA_DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -f db/migrations/0001_pre_sales.sql
--
-- The application-side `DbPreSaleSink` in lib/email/pre-sale-sink.ts uses the
-- same column names so the JSON store row shape stays 1:1 with the SQL table.
-- Until `AUGMENTA_DATABASE_URL` is provisioned by the CTO (see AUGA-129 /
-- AUGA-134), the application persists rows to the JSON store at
-- `data/store.json` via `StoreSchema.preSales` — the file lock in
-- `lib/email/store.ts` provides the same idempotency guarantee the
-- `session_id` UNIQUE constraint gives the SQL table.

BEGIN;

CREATE TABLE IF NOT EXISTS pre_sales (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text        NOT NULL,
  plan              text        NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount_cents      integer     NOT NULL CHECK (amount_cents >= 0),
  currency          text        NOT NULL DEFAULT 'eur' CHECK (length(currency) = 3),
  status            text        NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  session_id        text        UNIQUE NOT NULL,
  payment_intent_id text,
  promo_code        text,
  metadata          jsonb,
  first_name        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz
);

CREATE INDEX IF NOT EXISTS pre_sales_email_idx     ON pre_sales (email);
CREATE INDEX IF NOT EXISTS pre_sales_created_at_idx ON pre_sales (created_at DESC);
CREATE INDEX IF NOT EXISTS pre_sales_status_idx     ON pre_sales (status) WHERE status IN ('paid', 'pending');

COMMENT ON TABLE  pre_sales              IS 'Stripe Checkout pre-sale records (AUGA-128). Source of truth for paid status during the pré-lancement campaign.';
COMMENT ON COLUMN pre_sales.session_id   IS 'Stripe Checkout Session id. UNIQUE — webhook idempotency key.';
COMMENT ON COLUMN pre_sales.metadata     IS 'Raw Stripe payload fields not promoted to first-class columns (price_id, livemode, etc.).';

COMMIT;
