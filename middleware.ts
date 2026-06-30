// middleware.ts
// Auth sessions use the mobile Supabase project (cymvgxkxhpxjxdyeqcbr).
import { NextResponse }  from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res      = NextResponse.next()
  // createMiddlewareClient reads NEXT_PUBLIC_SUPABASE_URL — which we've
  // set to the mobile project in .env.local. No override needed here.
  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()
  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)"
  ],
}
