// components/upcoming-tournaments.tsx
"use client"

import { useState, useEffect } from "react"
import { getMobileSupabaseClient } from "@/lib/supabaseMobileClient"
import RegistrationStatus from "./registration-status"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"

type Tournament = {
  id: string
  name: string
  start_date: string
  event_type: string
}

export default function UpcomingTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await getMobileSupabaseClient()
        .from("tournaments")
        .select("id, name, start_date, event_type")
        .eq("event_type", "tournament")
        .neq("status", "draft")

      if (error) {
        console.error("Error loading tournaments:", error)
        setError(error.message)
        setTournaments([])
      } else if (data) {
        const today = new Date()
        const upcoming = (data as Tournament[])
          .filter((t) => {
            const parsed = new Date(t.start_date)
            return !isNaN(parsed.getTime()) && parsed >= today
          })
          .sort((a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
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
              <p className="text-sm text-gray-600">{new Date(t.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
            <RegistrationStatus tournamentId={t.id} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
