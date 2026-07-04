// components/registration-status.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getMobileSupabaseClient } from "@/lib/supabaseMobileClient"
import { Button } from "@/components/ui/button"

export default function RegistrationStatus({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(true)
  const [registered, setRegistered] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const mobile = getMobileSupabaseClient()
      // 1) grab current session from mobile project
      const {
        data: { session },
      } = await mobile.auth.getSession()

      // not signed in
      if (!session) {
        setSessionChecked(true)
        setLoading(false)
        return
      }

      // 2) check if user already registered for this tournament
      const { count, error } = await mobile
        .from("tournament_entries")
        .select("id", { head: true, count: "exact" })
        .eq("profile_id", session.user.id)
        .eq("tournament_id", tournamentId)
        .is("cancelled_at", null)

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

  // 4) not yet registered → go to the register page, which handles paid
  //    (Stripe checkout, guests welcome), free (direct), and guest sign-in.
  return (
    <Button
      onClick={() => router.push(`/play/${tournamentId}/register`)}
      className="bg-sky-600 hover:bg-sky-700 text-white"
    >
      Register for Event
    </Button>
  )
}
