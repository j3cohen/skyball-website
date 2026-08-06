import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client for the certification tables (same website DB as
// supabaseAdmin). Separate export because admin/lib/database.types.ts
// predates the cert_* tables — this client is deliberately untyped,
// matching how the main site's service-role client works.
export const certDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
