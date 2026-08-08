"use client";
// Browser-side Supabase client for the OLD website DB (shop products, product_prices).
// Use this in client components that query shop data (cart, product pages).
// Do NOT use for auth — auth is on the mobile DB via supabaseClient.ts.
import { createClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_WEBSITE_SUPABASE_URL/_ANON_KEY are LOCAL-TESTING overrides
// (unset in Vercel — production behavior unchanged).
const WEBSITE_URL =
  process.env.NEXT_PUBLIC_WEBSITE_SUPABASE_URL ??
  "https://cnhxpeadrylpssryywsd.supabase.co";
const WEBSITE_ANON =
  process.env.NEXT_PUBLIC_WEBSITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaHhwZWFkcnlscHNzcnl5d3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NTQ2MzUsImV4cCI6MjA2MjMzMDYzNX0._hoW22j1RVfIJESJbWTcqhCND1QTmKCZifAqZlbCLrc";

let _client: ReturnType<typeof createClient> | null = null;

export function getWebsiteShopClient() {
  if (_client) return _client;
  _client = createClient(WEBSITE_URL, WEBSITE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
