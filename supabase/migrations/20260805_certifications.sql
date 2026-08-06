-- ============================================================
-- Coaching Certifications (2026-08-05)
-- Run this in the WEBSITE project (cnhxpeadrylpssryywsd) SQL editor.
--
-- Authored to SkyBall Global conventions so these tables lift into
-- the redesign's greenfield migrations near-verbatim:
--   * uuid PKs via gen_random_uuid(), timestamptz created_at/updated_at
--   * text + CHECK constraints (no Postgres enums)
--   * snake_case plural table names
--   * RLS enabled on every table; deny-all (service-role only) —
--     all reads/writes go through server API routes
-- Transform note (redesign migration-plan §3.6): classify every
-- cert_* table below as IMPORT.
--
-- Cross-project note: user ids stored here (claimed_by_user_id,
-- user_id) are auth.users ids from the MOBILE project — plain uuid
-- columns, no FK (the two projects share no foreign keys anywhere).
-- ============================================================

-- Reuse the website DB's existing updated_at trigger function
-- (defined in 20260319_orders.sql); recreate defensively.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── cert_programs ───────────────────────────────────────────
-- One row per certification program (course content + rules).
-- Pricing lives on cert_offers, not here.
CREATE TABLE IF NOT EXISTS cert_programs (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    TEXT        UNIQUE NOT NULL,
  title                   TEXT        NOT NULL,
  description             TEXT,
  pass_threshold_type     TEXT        NOT NULL DEFAULT 'percent'
    CHECK (pass_threshold_type IN ('percent', 'count')),
  pass_threshold_value    INTEGER     NOT NULL DEFAULT 80
    CHECK (pass_threshold_value >= 0),
  retake_cooldown_minutes INTEGER     NOT NULL DEFAULT 0
    CHECK (retake_cooldown_minutes >= 0),
  expiry_months           INTEGER     NOT NULL DEFAULT 24
    CHECK (expiry_months > 0),
  status                  TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS cert_programs_set_updated_at ON cert_programs;
CREATE TRIGGER cert_programs_set_updated_at
  BEFORE UPDATE ON cert_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── cert_offers ─────────────────────────────────────────────
-- Purchasable packs for a program: cert-only (1-seat, 3-pack, …)
-- or equipment combos. equipment_items is a jsonb array of
-- free-text lines: [{ "label": "SkyBall Racket", "qty": 8 }, …].
-- Empty array = cert-only (no shipping); non-empty = combo
-- (checkout collects a US shipping address and the webhook writes
-- one orders row at the full pack price for fulfillment/revenue).
CREATE TABLE IF NOT EXISTS cert_offers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      UUID        NOT NULL REFERENCES cert_programs (id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  price_cents     INTEGER     NOT NULL CHECK (price_cents > 0),
  currency        TEXT        NOT NULL DEFAULT 'usd',
  seat_count      INTEGER     NOT NULL CHECK (seat_count > 0),
  equipment_items JSONB       NOT NULL DEFAULT '[]',
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  position        INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_offers_program_position_idx
  ON cert_offers (program_id, position);

DROP TRIGGER IF EXISTS cert_offers_set_updated_at ON cert_offers;
CREATE TRIGGER cert_offers_set_updated_at
  BEFORE UPDATE ON cert_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── cert_sections ───────────────────────────────────────────
-- Ordered course sections. position is intentionally NOT unique
-- so reorders can happen in a single statement. Threshold /
-- cooldown columns are per-section overrides; NULL = inherit the
-- program default.
CREATE TABLE IF NOT EXISTS cert_sections (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id              UUID        NOT NULL REFERENCES cert_programs (id) ON DELETE CASCADE,
  position                INTEGER     NOT NULL DEFAULT 0,
  title                   TEXT        NOT NULL,
  intro_enabled           BOOLEAN     NOT NULL DEFAULT FALSE,
  intro_title             TEXT,
  intro_body              TEXT,
  video_url               TEXT,       -- raw YouTube URL pasted by admin; embed id derived server-side
  pass_threshold_type     TEXT
    CHECK (pass_threshold_type IS NULL OR pass_threshold_type IN ('percent', 'count')),
  pass_threshold_value    INTEGER
    CHECK (pass_threshold_value IS NULL OR pass_threshold_value >= 0),
  retake_cooldown_minutes INTEGER
    CHECK (retake_cooldown_minutes IS NULL OR retake_cooldown_minutes >= 0),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_sections_program_position_idx
  ON cert_sections (program_id, position);

DROP TRIGGER IF EXISTS cert_sections_set_updated_at ON cert_sections;
CREATE TRIGGER cert_sections_set_updated_at
  BEFORE UPDATE ON cert_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── cert_questions ──────────────────────────────────────────
-- Multiple-choice quiz questions. choices is a jsonb array of
-- 2–6 strings; correct_index points into it. explanation is
-- optional admin-authored text shown to the learner AFTER an
-- attempt is graded. correct_index/explanation must never appear
-- in the course-outline API payload — only in graded results.
CREATE TABLE IF NOT EXISTS cert_questions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id    UUID        NOT NULL REFERENCES cert_sections (id) ON DELETE CASCADE,
  position      INTEGER     NOT NULL DEFAULT 0,
  prompt        TEXT        NOT NULL,
  choices       JSONB       NOT NULL,
  correct_index INTEGER     NOT NULL CHECK (correct_index >= 0),
  explanation   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_questions_section_position_idx
  ON cert_questions (section_id, position);

DROP TRIGGER IF EXISTS cert_questions_set_updated_at ON cert_questions;
CREATE TRIGGER cert_questions_set_updated_at
  BEFORE UPDATE ON cert_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── cert_purchases ──────────────────────────────────────────
-- Money side only (one row per Stripe checkout session). The
-- credential lives in cert_certifications — purchases and
-- credentials never share a table (Global FUT-2 separation).
-- stripe_session_id UNIQUE doubles as the webhook idempotency
-- backstop (webhook + success-page fulfill may race).
CREATE TABLE IF NOT EXISTS cert_purchases (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id               UUID        NOT NULL REFERENCES cert_programs (id),
  offer_id                 UUID        REFERENCES cert_offers (id),
  stripe_session_id        TEXT        UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  purchaser_email          TEXT,
  purchaser_name           TEXT,
  seat_count               INTEGER     NOT NULL CHECK (seat_count > 0),
  amount_total_cents       INTEGER,
  currency                 TEXT        NOT NULL DEFAULT 'usd',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_purchases_program_idx
  ON cert_purchases (program_id, created_at DESC);

-- ── cert_seats ──────────────────────────────────────────────
-- One row per purchased seat. claim_token is the secret in the
-- seat's unique claim link (crypto.randomBytes(24), base64url).
-- claimed_by_user_id is the MOBILE-project auth user id (no FK).
-- No unique (program, user) here: recertification after expiry
-- claims a new seat; "one active enrollment per user+program" is
-- enforced in the claim route.
CREATE TABLE IF NOT EXISTS cert_seats (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id        UUID        NOT NULL REFERENCES cert_purchases (id) ON DELETE CASCADE,
  program_id         UUID        NOT NULL REFERENCES cert_programs (id),
  claim_token        TEXT        UNIQUE NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'unclaimed'
    CHECK (status IN ('unclaimed', 'claimed', 'revoked')),
  claimed_by_user_id UUID,
  claimed_email      TEXT,
  claimed_name       TEXT,
  claimed_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_seats_purchase_idx
  ON cert_seats (purchase_id);
CREATE INDEX IF NOT EXISTS cert_seats_claimed_by_idx
  ON cert_seats (claimed_by_user_id);

-- ── cert_enrollments ────────────────────────────────────────
-- One enrollment per claimed seat. Section pass state is DERIVED
-- from cert_quiz_attempts (any passed attempt), so there is no
-- progress column to drift.
CREATE TABLE IF NOT EXISTS cert_enrollments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id      UUID        UNIQUE NOT NULL REFERENCES cert_seats (id),
  program_id   UUID        NOT NULL REFERENCES cert_programs (id),
  user_id      UUID        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_enrollments_user_program_idx
  ON cert_enrollments (user_id, program_id);

DROP TRIGGER IF EXISTS cert_enrollments_set_updated_at ON cert_enrollments;
CREATE TRIGGER cert_enrollments_set_updated_at
  BEFORE UPDATE ON cert_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── cert_quiz_attempts ──────────────────────────────────────
-- Audit trail of every graded quiz attempt; the latest failed
-- attempt is the retake-cooldown source of truth. answers is a
-- snapshot [{ "question_id": uuid, "choice_index": int }, …] so
-- later question edits never rewrite history (correct_count /
-- question_count are frozen at grading time).
CREATE TABLE IF NOT EXISTS cert_quiz_attempts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id  UUID        NOT NULL REFERENCES cert_enrollments (id) ON DELETE CASCADE,
  section_id     UUID        NOT NULL REFERENCES cert_sections (id),
  attempt_number INTEGER     NOT NULL DEFAULT 1,
  answers        JSONB       NOT NULL,
  correct_count  INTEGER     NOT NULL,
  question_count INTEGER     NOT NULL,
  passed         BOOLEAN     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_quiz_attempts_enrollment_section_idx
  ON cert_quiz_attempts (enrollment_id, section_id, created_at DESC);

-- ── cert_certifications ─────────────────────────────────────
-- The certified-coaches registry (the credential itself; Global
-- FUT-2: "certifications registry linked to profiles").
-- verify_code is the short public code on the certificate and in
-- /coaching/verify/[code]. Expiry is derived (now() > expires_at);
-- status exists only for manual revocation.
CREATE TABLE IF NOT EXISTS cert_certifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  verify_code   TEXT        UNIQUE NOT NULL,
  enrollment_id UUID        UNIQUE NOT NULL REFERENCES cert_enrollments (id),
  program_id    UUID        NOT NULL REFERENCES cert_programs (id),
  user_id       UUID        NOT NULL,
  full_name     TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cert_certifications_user_idx
  ON cert_certifications (user_id);
CREATE INDEX IF NOT EXISTS cert_certifications_program_expires_idx
  ON cert_certifications (program_id, expires_at);

-- ── Row Level Security ──────────────────────────────────────
-- deny-all: service-role only. Learner reads/writes go through
-- Bearer-authenticated server API routes (quiz answers must never
-- be readable client-side); admin authoring goes through
-- requireAdminSession service-role routes. Deliberately no
-- policies on any cert_* table.
ALTER TABLE cert_programs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_sections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_seats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_enrollments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_quiz_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_certifications ENABLE ROW LEVEL SECURITY;

GRANT ALL ON cert_programs, cert_offers, cert_sections, cert_questions,
             cert_purchases, cert_seats, cert_enrollments,
             cert_quiz_attempts, cert_certifications
  TO service_role;
