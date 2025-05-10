// utils/supabase/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareSupabaseClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookies: request.cookies,
  })
  // Calls getUser() to refresh tokens if needed
  await supabase.auth.getUser()
  return response
}
