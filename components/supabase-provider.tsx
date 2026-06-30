// File: components/supabase-provider.tsx

"use client"

import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { createPagesBrowserClient }  from "@supabase/auth-helpers-nextjs"

// Target the mobile project explicitly (web app auth lives there), not the
// ambiguous NEXT_PUBLIC_SUPABASE_URL.
const supabaseBrowser = createPagesBrowserClient({
  supabaseUrl: process.env.NEXT_PUBLIC_MOBILE_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_MOBILE_SUPABASE_ANON_KEY,
})

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionContextProvider supabaseClient={supabaseBrowser}>
      {children}
    </SessionContextProvider>
  )
}
