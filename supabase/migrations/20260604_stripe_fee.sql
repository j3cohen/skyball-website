-- Add Stripe processing fee column to orders table.
-- Populated by the Stripe import; NULL means not yet synced from Stripe.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stripe_fee_cents INTEGER;
