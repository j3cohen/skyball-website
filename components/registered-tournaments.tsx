// components/registered-tournaments.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getMobileSupabaseClient } from "@/lib/supabaseMobileClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"


// Registrations now live in the mobile project's tournament_entries table
// (profile_id / cancelled_at), joined to tournaments.start_date.
type TournamentJoin = { id: string; name: string; start_date: string }
type RawRegistration = {
  id: string
  registered_at: string
  tournament: TournamentJoin[] | TournamentJoin | null
}

// Your “clean” shape:
type Registration = {
  id: string
  registered_at: string
  tournament: {
    id: string
    name: string
    date: string
  }
}

export default function RegisteredTournaments() {
  const [items, setItems] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const mobile = getMobileSupabaseClient()
      const {
        data: { session },
      } = await mobile.auth.getSession()

      if (!session) {
        setItems([])
        setLoading(false)
        return
      }

      const { data, error } = await mobile
        .from("tournament_entries")
        .select(`
          id,
          registered_at,
          tournament: tournaments (
            id,
            name,
            start_date
          )
        `)
        .eq("profile_id", session.user.id)
        .is("cancelled_at", null)
        .order("registered_at", { ascending: false })

      if (error) {
        console.error("Error loading registrations:", error)
        setItems([])
      } else if (data) {
        // map RawRegistration[] ➔ Registration[]
        const raw = data as unknown as RawRegistration[]
        const clean: Registration[] = raw
          .map((r) => {
            const t = Array.isArray(r.tournament) ? r.tournament[0] : r.tournament
            if (!t) return null
            return {
              id: r.id,
              registered_at: r.registered_at,
              tournament: {
                id: t.id,
                name: t.name,
                date: new Date(t.start_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
              },
            }
          })
          .filter((r): r is Registration => r !== null)

        // filter out past tournaments
        const now = new Date()
        const upcoming = clean.filter((r) => {
          const dt = new Date(r.tournament.date)
          return !isNaN(dt.valueOf()) && dt >= now
        })

        setItems(upcoming)
      }

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <p>Loading your registrations…</p>
  }
  if (items.length === 0) {
    return <p>You’re not registered for any upcoming tournaments yet.</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Upcoming Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id}>
              <Link
                href={`/play/${r.tournament.id}`}
                className="text-sky-600 hover:underline"
              >
                {r.tournament.name}
              </Link>{" "}
              on {r.tournament.date}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
