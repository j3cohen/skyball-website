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
  open_play?: boolean
}

export default function UpcomingTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name, date, open_play")

      if (error) {
        console.error("Error loading tournaments:", error)
        setError(error.message)
        setTournaments([])
      } else if (data) {
        const today = new Date()
        const upcoming = data
          .filter((t) => {
            if (t.open_play) return false // skip open play events
            const parsed = new Date(t.date)
            return !isNaN(parsed.getTime()) && parsed >= today
          })
          .sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          )

        setTournaments(upcoming)
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

  if (tournaments.length === 0) {
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
        {tournaments.map((t) => (
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
