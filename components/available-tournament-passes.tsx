// components/available-tournament-passes.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

type AvailablePass = {
  id: string
  quantity_remaining: number
  pass_type: {
    id: string
    name: string
    passes_quantity: number
  }
}

export default function AvailableTournamentPasses() {
  const [available, setAvailable] = useState<AvailablePass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from("passes")
        .select(`
          id,
          quantity_remaining,
          pass_type: pass_types (
            id,
            name,
            passes_quantity
          )
        `)

      if (error) {
        console.error("Error loading passes:", error)
        setAvailable([])
      } else if (data) {
        // normalize the nested pass_type and filter out zero-remaining
        const clean = (data as any[])
          .map((item) => ({
            id: item.id,
            quantity_remaining: item.quantity_remaining,
            pass_type: Array.isArray(item.pass_type)
              ? item.pass_type[0]
              : item.pass_type,
          }))
          .filter((item) => item.quantity_remaining > 0)
        setAvailable(clean as AvailablePass[])
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p>Loading your passes…</p>
  if (available.length === 0) return <p>You have no passes available.</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Passes</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {available.map((p) => (
            <li key={p.id}>
              {p.pass_type.name}: {p.quantity_remaining} remaining
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
