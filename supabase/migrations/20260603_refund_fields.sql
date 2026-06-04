-- Add refund tracking fields to orders table.
-- Run via: supabase db push  OR paste into the Supabase SQL editor.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status       TEXT    NOT NULL DEFAULT 'none'
    CHECK (refund_status IN ('none', 'partial', 'full'));
