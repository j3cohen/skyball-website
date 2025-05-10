// app/api/auth/[...supabase]/route.ts
import { handleAuth } from "@supabase/auth-helpers-nextjs"

export const { GET, POST } = handleAuth({
  logout: { returnTo: "/login" }
})
