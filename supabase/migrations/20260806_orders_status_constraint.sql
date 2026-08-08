-- ============================================================
-- Widen orders.fulfillment_status CHECK (2026-08-06)
-- Run in the WEBSITE project SQL editor (alongside, or before,
-- 20260805_certifications.sql).
--
-- WHY (latent prod bug found while building the local test stack):
-- prod still enforces the original CHECK
--   ('pending','processing','fulfilled','cancelled')
-- but the app writes two additional values:
--   * the Stripe webhook tags event/tournament orders 'event'
--     (app/api/webhooks/stripe → lib/server/stripeWebhookHandler.ts)
--   * the admin bulk-update + mark-events routes write 'needs-match'
--     and 'event'
-- No paid event registration has completed in prod yet (verified
-- read-only 2026-08-06: zero 'event' orders, zero stripe-paid
-- tournament_entries), so the first one would make the webhook throw
-- ON THE ORDERS UPSERT — which also aborts the tournament_entries
-- dual-write. This makes that path work before it's ever exercised.
-- ============================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check
  CHECK (fulfillment_status IN
    ('pending', 'processing', 'fulfilled', 'cancelled', 'event', 'needs-match'));
