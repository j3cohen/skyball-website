// lib/supabaseClient.ts
"use client"

import { createClient } from "@supabase/supabase-js"
// import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs"

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// export const supabaseBrowser = createPagesBrowserClient()
