// components/registered-tournaments.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"


// exactly what Supabase returns per row
type RawRegistration = {
  id: string
  registered_at: string
  tournament: {
    id: string
    name: string
    date: string
  }[]
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

      const { data, error } = await supabase
        .from("registrations")
        .select(`
          id,
          registered_at,
          tournament: tournaments (
            id,
            name,
            date
          )
        `)
        .order("registered_at", { ascending: false })

      if (error) {
        console.error("Error loading registrations:", error)
        setItems([])
      } else if (data) {
        // map RawRegistration[] ➔ Registration[]
        const raw = data as RawRegistration[]
        const clean: Registration[] = (raw).map((r) => ({
          id: r.id,
          registered_at: r.registered_at,
          tournament: Array.isArray(r.tournament)
            ? r.tournament[0]
            : r.tournament || { id: "", name: "", date: "" },
        }))

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
