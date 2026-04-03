-- ============================================================
-- Orders + Admin Users
-- Run this in the Supabase SQL editor or via `supabase db push`
-- ============================================================

-- ── Orders ──────────────────────────────────────────────────
-- Stores one row per completed Stripe checkout session.
-- `order_data` is a versioned JSONB payload; add new fields to
-- the nested `customizations` object on each item without ever
-- altering this column's type.
CREATE TABLE IF NOT EXISTS orders (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id        TEXT        UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  customer_email           TEXT,
  customer_name            TEXT,
  customer_phone           TEXT,
  shipping_address         JSONB,          -- { line1, line2, city, state, postal_code, country }

  -- Structured order payload (see below for shape).
  -- version 1 shape:
  --   { version: 1,
  --     items: [{ stripe_price_id, product_name, quantity,
  --               unit_amount_cents, currency, amount_total_cents,
  --               customizations: { ball_color?, grip_colors?,
  --                                 unselected_grips?, crewneck_size?,
  --                                 ...future keys } }],
  --     customer_selections: { heard_about_us?, order_notes? } }
  order_data               JSONB       NOT NULL DEFAULT '{}',

  order_total_cents        INTEGER,
  order_currency           TEXT        NOT NULL DEFAULT 'usd',
  order_summary            TEXT,           -- human-readable one-liner

  fulfillment_status       TEXT        NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'processing', 'fulfilled', 'cancelled')),

  tracking_number          TEXT,
  internal_notes           TEXT,
  heard_about_us           TEXT,
  customer_order_notes     TEXT,

  raw_stripe_session       JSONB,          -- full Stripe session for reference / debugging

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at             TIMESTAMPTZ
);

-- Auto-bump updated_at on every write
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Common admin query indexes
CREATE INDEX IF NOT EXISTS orders_fulfillment_status_idx ON orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx         ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_email_idx     ON orders (customer_email);

-- ── Admin Users ─────────────────────────────────────────────
-- Any Supabase auth user whose ID appears here gets admin access.
-- Add rows manually in the Supabase dashboard or SQL editor:
--   INSERT INTO admin_users (id) VALUES ('<auth-user-uuid>');
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by   TEXT
);

-- ── Row Level Security ───────────────────────────────────────
-- All application writes go through service-role API routes which
-- bypass RLS.  The only authenticated read allowed is a user
-- checking their own admin record (used in the admin layout).
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_self_read" ON admin_users;
CREATE POLICY "admin_users_self_read"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
