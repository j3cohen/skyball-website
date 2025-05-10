// components/tournament-pass-history.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

type PassHistoryItem = {
  id: string
  purchased_at: string
  quantity_total: number
  quantity_remaining: number
  pass_type: {
    name: string
    passes_quantity: number
  }
  uses: Array<{
    id: string
    tournament_id: string
    registered_at: string
  }>
}

export default function TournamentPassHistory() {
  const [history, setHistory] = useState<PassHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from("passes")
        .select(`
          id,
          purchased_at,
          quantity_total,
          quantity_remaining,
          pass_type: pass_types (
            name,
            passes_quantity
          ),
          uses: registrations (
            id,
            tournament_id,
            registered_at
          )
        `)
      if (error) {
        console.error(error)
        setHistory([])
      } else if (data) {
        setHistory(
          data.map((item) => ({
            ...item,
            pass_type: Array.isArray(item.pass_type) ? item.pass_type[0] : item.pass_type,
          })) as PassHistoryItem[]
        )
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p>Loading pass history…</p>
  if (history.length === 0) return <p>No pass history found.</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pass Purchase & Usage History</CardTitle>
      </CardHeader>
      <CardContent>
        {history.map((h) => (
          <div key={h.id} className="mb-6">
            <p className="font-medium">
              {h.pass_type.name} – purchased at{" "}
              {new Date(h.purchased_at).toLocaleString("en-US", {
                timeZone: "America/New_York",
              })}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Used {h.quantity_total - h.quantity_remaining} of {h.quantity_total} passes,{" "}
              {h.quantity_remaining} remaining
            </p>
            {h.uses.length > 0 && (
              <>
                <p className="text-sm font-semibold">Used on:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {h.uses.map((use) => (
                    <li key={use.id}>
                      <Link
                        href={`/play/${use.tournament_id}`}
                        className="text-sky-600 hover:underline"
                      >
                        {use.tournament_id}
                      </Link>{" "}
                      at{" "}
                      {new Date(use.registered_at).toLocaleDateString("en-US", {
                        timeZone: "America/New_York",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
