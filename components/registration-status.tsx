// components/registration-status.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"

export default function RegistrationStatus({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(true)
  const [registered, setRegistered] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    (async () => {
      // 1) check session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSessionChecked(true)
        return
      }

      // 2) see if this user already has a registration
      const { data, error } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("tournament_id", tournamentId)
        .limit(1)

      if (error) {
        console.error("Error checking registration:", error)
      } else {
        setRegistered((data ?? []).length > 0)
      }
      setSessionChecked(true)
      setLoading(false)
    })()
  }, [tournamentId])

  if (loading) return null

  if (!sessionChecked) return null

  // if already registered
  if (registered) {
    return (
      <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
        Registered
      </span>
    )
  }

  // not logged in
  const handleClick = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/login?from=/play/${tournamentId}`)
      return
    }
    router.push(`/play/${tournamentId}/register`)
  }

  return (
    <Button onClick={handleClick} className="bg-sky-600 hover:bg-sky-700 text-white">
      Register for Event
    </Button>
  )
}
