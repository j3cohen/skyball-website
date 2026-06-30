"use client";
// lib/supabaseMobileClient.ts
// Browser-side Supabase client for the mobile app database.
// Used in client components that read tournament/player/rankings data.
import { createClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof createClient> | null = null;

export function getMobileSupabaseClient() {
  if (_client) return _client;

  const url  = process.env.NEXT_PUBLIC_MOBILE_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_MOBILE_SUPABASE_ANON_KEY!;

  _client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
