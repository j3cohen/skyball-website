// components/upcoming-tournaments.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import RegistrationStatus from "./registration-status"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"

type Tournament = {
  id: string
  name: string
  date: string  // stored as text, e.g. "May 15, 2025"
}

export default function UpcomingTournaments() {
  const [tours, setTours] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, date")
        .order("date", { ascending: true })

      if (error) {
        console.error("Failed loading tournaments:", error)
        setError("Unable to load upcoming tournaments.")
        setTours([])
      } else {
        setTours(data ?? [])
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent>Loading upcoming tournaments…</CardContent>
      </Card>
    )
  }
  if (error) {
    return (
      <Card>
        <CardContent className="text-red-600">{error}</CardContent>
      </Card>
    )
  }
  if (tours.length === 0) {
    return (
      <Card>
        <CardContent>No upcoming tournaments.</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Tournaments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tours.map((t) => (
          <div key={t.id} className="flex justify-between items-center">
            <div>
                <Link
                  href={`/play/${t.id}`}
                  className="font-medium text-sky-600 hover:underline"
                >
                  {t.name}
                </Link>
              <p className="text-sm text-gray-600">{t.date}</p>
            </div>
            <RegistrationStatus tournamentId={t.id} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
