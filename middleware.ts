// middleware.ts
import { NextResponse }           from "next/server"
import type { NextRequest }       from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  // This will replay & refresh the HTTP-only cookies into req/res
  await supabase.auth.getSession()
  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)"
  ],
}
