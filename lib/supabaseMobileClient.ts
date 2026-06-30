"use client";
// lib/supabaseMobileClient.ts
// Browser-side Supabase client for the mobile app database.
// Used in client components that read tournament/player/rankings data AND that
// need the logged-in auth session (e.g. registration status). Persistence is
// enabled so it shares the same stored session as lib/supabaseClient.ts — both
// point at the mobile project, so they use the same storage key. Without this,
// getSession() returns null even when the user is signed in.
import { createClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof createClient> | null = null;

export function getMobileSupabaseClient() {
  if (_client) return _client;

  const url  = process.env.NEXT_PUBLIC_MOBILE_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_MOBILE_SUPABASE_ANON_KEY!;

  _client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // lib/supabaseClient.ts already handles the login-URL session exchange.
      detectSessionInUrl: false,
    },
  });

  return _client;
}
