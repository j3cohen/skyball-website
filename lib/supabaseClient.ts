// lib/supabaseClient.ts
"use client"

import { createClient } from "@supabase/supabase-js"

// The web app authenticates against the MOBILE project (auth, tournaments,
// rankings, players, registrations all live there). Use the dedicated mobile
// env vars explicitly — do NOT use NEXT_PUBLIC_SUPABASE_URL, which is ambiguous
// (the legacy website project still backs the shop + admin auth).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_MOBILE_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_MOBILE_SUPABASE_ANON_KEY!
)
