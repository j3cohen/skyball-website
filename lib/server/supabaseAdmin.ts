import { createClient } from "@supabase/supabase-js";

// Always points at the old website DB (shop products, orders, Stripe webhook).
// NEXT_PUBLIC_SUPABASE_URL now points at the mobile DB, so we hardcode the
// old URL here to avoid the service-role key mismatch that causes Invalid API key.
// NEXT_PUBLIC_WEBSITE_SUPABASE_URL is a LOCAL-TESTING override (unset in Vercel):
// point it at a local Supabase (http://127.0.0.1:54321) with the matching
// local SUPABASE_SERVICE_ROLE_KEY to test against a prod-schema clone.
const WEBSITE_URL =
  process.env.NEXT_PUBLIC_WEBSITE_SUPABASE_URL ??
  "https://cnhxpeadrylpssryywsd.supabase.co";

export const supabaseAdmin = createClient(
  WEBSITE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
