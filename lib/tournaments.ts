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
  date_actual        : string | null
  start_at           : string | null
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
    ...(row?.date_actual && { date_actual: row.date_actual }),
    ...(row?.start_at && {start_at: row.start_at}),
    
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

/** Fetch the basic winner/runner-up/score summary for a given tournament */
export async function getTournamentSummary(id: string): Promise<{
  winner: string
  runner_up: string
  score: string
} | null> {
  const supabase = createServerComponentClient({ cookies })
  const { data, error } = await supabase
    .rpc("get_tournament_summary", { p_tournament_id: id })
    .single()

  if (error || !data) return null
  const summary = data as { winner: string; runner_up: string; score: string }
  return {
    winner: summary.winner,
    runner_up: summary.runner_up,
    score: summary.score,
  }
}