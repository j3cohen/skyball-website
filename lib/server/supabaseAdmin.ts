import { createClient } from "@supabase/supabase-js";

// Always points at the old website DB (shop products, orders, Stripe webhook).
// NEXT_PUBLIC_SUPABASE_URL now points at the mobile DB, so we hardcode the
// old URL here to avoid the service-role key mismatch that causes Invalid API key.
const WEBSITE_URL = "https://cnhxpeadrylpssryywsd.supabase.co";

export const supabaseAdmin = createClient(
  WEBSITE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
