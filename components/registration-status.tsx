// components/registration-status.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"

export default function RegistrationStatus({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(true)
  const [registered, setRegistered] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      // 1) grab current session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // not signed in
      if (!session) {
        setSessionChecked(true)
        setLoading(false)
        return
      }

      // 2) check if user already registered for this tournament
      const { count, error } = await supabase
        .from("registrations")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", session.user.id)
        .eq("tournament_id", tournamentId)

      if (error) {
        console.error("Error checking registration:", error.message)
      } else if (typeof count === "number") {
        setRegistered(count > 0)
      }

      setSessionChecked(true)
      setLoading(false)
    })()
  }, [tournamentId])

  if (loading || !sessionChecked) {
    return null
  }

  // 3) already registered → badge + dashboard link
  if (registered) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
          Registered
        </span>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  // 4) not signed in or not yet registered → show Register button
  const handleClick = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push(`/login?from=/play/${tournamentId}/register`)
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
