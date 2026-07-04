// lib/server/supabaseMobile.ts
// Server-only Supabase client for the mobile app database.
// Use for tournament, event, player, rankings, and registration data.
// Never use for shop or admin operations — those stay on the website project.
import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getMobileSupabase(): SupabaseClient {
  if (_client) return _client;

  const url  = process.env.NEXT_PUBLIC_MOBILE_SUPABASE_URL;
  const key  = process.env.MOBILE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url)  throw new Error("NEXT_PUBLIC_MOBILE_SUPABASE_URL is required.");
  if (!key)  throw new Error("MOBILE_SUPABASE_SERVICE_ROLE_KEY is required.");

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}

export const supabaseMobile = getMobileSupabase;
