// lib/server/siteIntake.ts
// The only module that touches public.notification_signups and
// public.site_inquiries. Both tables are RLS deny-all with zero policies and
// hold PII, so every write goes through the service-role client here — never
// the anon key, never a client component.
//
// The schema mirrors skyball-backend 0026_site_intake.sql column-for-column so
// the cutover ETL is a straight copy. Do not add columns or reshape values.

import "server-only";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { rateLimit } from "@/lib/server/rateLimiter";

/** skyball.us is US-only. Server-set, never taken from user input. */
export const COUNTRY_CODE = "US";

export type NotificationType =
  | "open_play"
  | "tournaments"
  | "pop_ups"
  | "special_events"
  | "newsletter";

export type SignupSource = "notification_form" | "newsletter_form";

export type InquiryKind = "school" | "host" | "where_to_play" | "general";

/** Trim, and collapse "" to null for nullable columns. */
function nullableText(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Upsert a notification/newsletter subscriber.
 *
 * Always via the RPC — it owns the merge (same email + country unions the
 * notification types onto the existing row rather than duplicating it).
 * Never reimplement that here. Throws on failure so the caller can fail the
 * request; a silent success that stored nothing is the thing we are fixing.
 */
export async function recordNotificationSignup(input: {
  name: string;
  email: string;
  locality: string;
  types: NotificationType[];
  source: SignupSource;
  phone?: string | null;
  countryCode?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.rpc("upsert_notification_signup", {
    p_name: input.name.trim(),
    // Casing is preserved on purpose — the unique index is on lower(email).
    p_email: input.email.trim(),
    p_country_code: input.countryCode ?? COUNTRY_CODE,
    p_locality: input.locality.trim(),
    p_types: input.types,
    p_source: input.source,
    p_phone: nullableText(input.phone),
  });

  if (error) {
    throw new Error(`recordNotificationSignup failed: ${error.message}`);
  }
}

/** Append-only insert — one row per submission, no dedupe. Throws on failure. */
export async function recordSiteInquiry(input: {
  kind: InquiryKind;
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  locality?: string | null;
  details?: Record<string, unknown> | null;
  countryCode?: string;
}): Promise<void> {
  const details =
    input.details && Object.keys(input.details).length > 0 ? input.details : null;

  const { error } = await supabaseAdmin.from("site_inquiries").insert({
    kind: input.kind,
    name: input.name.trim(),
    email: nullableText(input.email),
    phone: nullableText(input.phone),
    message: nullableText(input.message),
    locality: nullableText(input.locality),
    country_code: input.countryCode ?? COUNTRY_CODE,
    details,
  });

  if (error) {
    throw new Error(`recordSiteInquiry failed: ${error.message}`);
  }
}

// ── Abuse protection for these public, unauthenticated PII writes ──────────
// Proportionate on purpose: this is an interim measure on a site being retired.

/** Hidden field name rendered on every intake form. Bots fill it; humans don't. */
export const HONEYPOT_FIELD = "website";

/** True when the honeypot was filled — drop the submission, but look successful. */
export function isHoneypotTripped(formData: FormData): boolean {
  return ((formData.get(HONEYPOT_FIELD) as string) ?? "").trim() !== "";
}

// Generous on purpose: a real person correcting a typo submits two or three
// times. This is here to blunt scripted abuse, not to police humans.
const INTAKE_LIMIT = 10;
const INTAKE_WINDOW_MS = 60_000;

/**
 * Per-IP fixed-window throttle for the intake server actions. Server actions
 * have no Request object, so this reads the forwarded IP from headers() rather
 * than using rateLimitResponse().
 */
export function isIntakeThrottled(bucket: string): boolean {
  let ip = "unknown";
  try {
    const h = headers();
    ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  } catch {
    // headers() is unavailable outside a request scope (e.g. unit tests).
  }
  return !rateLimit(`intake:${bucket}:${ip}`, INTAKE_LIMIT, INTAKE_WINDOW_MS).allowed;
}

export const THROTTLED_MESSAGE =
  "Too many submissions. Please wait a minute and try again.";
