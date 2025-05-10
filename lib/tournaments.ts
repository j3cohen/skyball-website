// lib/tournaments.ts
import { supabase } from "@/lib/supabaseClient"
import { events as staticEvents, type Event as StaticEvent } from "@/data/events"

type TournamentRow = {
  id               : string
  name             : string
  date             : string
  time             : string
  location         : string
  description      : string
  max_participants : number | null
  prize            : string | null
  registration_fee : string
}

/** Merge a single row atop its static fallback */
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
  }
}

/** Fetch all tournaments from Supabase, merge with staticEvents */
export async function getAllTournaments(): Promise<StaticEvent[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")

// DEBUG: print raw Supabase response
  console.log("[getAllTournaments] data.length:", data?.length, "error:", error);
  console.log("[getAllTournaments] supabase returned:", { data, error })

  // cast into your TS shape
  const rows = (data ?? []) as TournamentRow[]
  const rowMap = new Map(rows.map((r) => [r.id, r]))

  // union static IDs + DB IDs
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

/** Fetch one “event” by id — will pull from Supabase if it exists, otherwise fall back to staticEvents */
export async function getTournamentById(id: string): Promise<StaticEvent | null> {
  const { data: row, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .maybeSingle()     // ← here’s the key change

  // if a real DB error (network, permissions, etc), you might want to log
  if (error) console.error("Supabase error fetching tournament:", error)

  const fallback = staticEvents.find((e) => e.id === id)

  // if neither DB nor static knows about this id → 404
  if (!row && !fallback) {
    return null
  }

  return mergeOne(fallback, row ?? undefined)
}
