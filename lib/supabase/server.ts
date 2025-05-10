// utils/supabase/server.ts
import { createServerComponentClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerSupabase() {
  return createServerComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies,
  })
}
