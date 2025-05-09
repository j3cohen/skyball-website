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

/** Fetch one tournament by id, merge with static fallback */
export async function getTournamentById(
  id: string
): Promise<StaticEvent | null> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single()

  // DEBUG: print raw Supabase response
  console.log("[getAllTournaments] data.length:", data?.length, "error:", error);
  console.log(`[getTournamentById: ${id}]`, { data, error })

  // cast into your TS shape
  const row = (data ?? null) as TournamentRow | null
  const fallback = staticEvents.find((e) => e.id === id)

  // nothing in DB and nothing static → 404
  if (!row && (!fallback || error)) {
    return null
  }

  return mergeOne(fallback ?? ({} as StaticEvent), row ?? undefined)
}
