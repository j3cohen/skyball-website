import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  if (!anon) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");

  _client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
