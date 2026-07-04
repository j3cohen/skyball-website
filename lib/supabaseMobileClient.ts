"use client";
// lib/supabaseMobileClient.ts
// Browser-side Supabase client for the mobile project (tournaments, players,
// rankings, registrations). This is the SAME instance as lib/supabaseClient.ts
// — the web app's auth client already targets the mobile project, so reusing it
// guarantees the logged-in session is shared (one GoTrue client, one session).
// Without this, getSession() returned null and RLS-protected writes went out as
// anonymous.
import { supabase } from "@/lib/supabaseClient";

export function getMobileSupabaseClient() {
  return supabase;
}
