import { createClient, SupabaseClient } from "@supabase/supabase-js";

// This client always points at the original website DB (shop products, orders, admin).
// It must NOT use NEXT_PUBLIC_SUPABASE_URL which now points at the mobile project.
// NEXT_PUBLIC_WEBSITE_SUPABASE_URL/_ANON_KEY are LOCAL-TESTING overrides
// (unset in Vercel — production behavior unchanged).
const WEBSITE_URL =
  process.env.NEXT_PUBLIC_WEBSITE_SUPABASE_URL ??
  "https://cnhxpeadrylpssryywsd.supabase.co";
const WEBSITE_ANON =
  process.env.NEXT_PUBLIC_WEBSITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaHhwZWFkcnlscHNzcnl5d3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTQ2MzUsImV4cCI6MjA2MjMzMDYzNX0._hoW22j1RVfIJESJbWTcqhCND1QTmKCZifAqZlbCLrc";

let _client: SupabaseClient | null = null;

export function getSupabasePublic(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(WEBSITE_URL, WEBSITE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
