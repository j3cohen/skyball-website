// File: components/supabase-provider.tsx
"use client"

import { SessionContextProvider } from "@supabase/auth-helpers-react"
import { supabaseBrowser }           from "@/lib/supabaseClient"

interface Props {
  children: React.ReactNode
}

export default function SupabaseProvider({ children }: Props) {
  return (
    <SessionContextProvider supabaseClient={supabaseBrowser}>
      {children}
    </SessionContextProvider>
  )
}
