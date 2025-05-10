// File: components/supabase-provider.tsx

"use client"

import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { createPagesBrowserClient }  from "@supabase/auth-helpers-nextjs"

const supabaseBrowser = createPagesBrowserClient()

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionContextProvider supabaseClient={supabaseBrowser}>
      {children}
    </SessionContextProvider>
  )
}
