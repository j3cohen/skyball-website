// lib/tournaments.ts

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies }                       from "next/headers"
import { events as staticEvents, type Event as StaticEvent } from "@/data/events"

type TournamentRow = {
  id                 : string
  name               : string
  date               : string
  time               : string
  location           : string
  description        : string
  max_participants   : number | null
  prize              : string | null
  registration_fee   : string
  points_value       : number
  current_participants: number      // ← from the view
}

// Merge helper
function mergeOne(fallback: StaticEvent, row?: TournamentRow): StaticEvent {
  return {
    ...fallback,
    ...(row?.name               && { name: row.name               }),
    ...(row?.date               && { date: row.date               }),
    ...(row?.time               && { time: row.time               }),
    ...(row?.location           && { location: row.location       }),
    ...(row?.description        && { description: row.description }),
    ...(row?.max_participants   != null && { maxParticipants: row.max_participants }),
    ...(row?.prize              && { prize: row.prize             }),
    ...(row?.registration_fee   && { registrationFee: row.registration_fee }),
    ...(row?.points_value       != null && { pointsValue: row.points_value }),
    // inject currentParticipants
    ...(row?.current_participants != null && { currentParticipants: row.current_participants }),
  }
}

/** Fetch & merge all tournaments */
export async function getAllTournaments(): Promise<StaticEvent[]> {
  const supabase = createServerComponentClient({ cookies })

  // Query the view instead of the raw table:
  const { data } = await supabase
    .from("tournament_with_counts")
    .select("*")

  const rows = data ?? []
  const rowMap = new Map(rows.map((r) => [r.id, r]))

  const allIds = Array.from(
    new Set<string>([
      ...staticEvents.map((e) => e.id),
      ...rows.map((r) => r.id),
    ])
  )

  return allIds.map((id) => {
    const fallback = staticEvents.find((e) => e.id === id) ?? ({} as StaticEvent)
    return mergeOne(fallback, rowMap.get(id))
  })
}

/** Fetch & merge one tournament by ID */
export async function getTournamentById(id: string): Promise<StaticEvent | null> {
  const supabase = createServerComponentClient({ cookies })

  const { data: row, error } = await supabase
    .from("tournament_with_counts")
    .select("*")
    .eq("id", id)
    .single()

  const fallback = staticEvents.find((e) => e.id === id) ?? null
  if (error && !fallback) return null

  return mergeOne(fallback ?? ({} as StaticEvent), row ?? undefined)
}
