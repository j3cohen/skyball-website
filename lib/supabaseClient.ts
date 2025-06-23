import { createClientComponentClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "./supabase.types"

// Client-side Supabase client
export const supabase = createClientComponentClient<Database>()

// Server-side Supabase client (for use in Server Components)
export const createServerClient = () => {
  const { cookies } = require("next/headers")
  return createServerComponentClient<Database>({ cookies })
}

// Verify environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

console.log("Supabase client initialized with URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
