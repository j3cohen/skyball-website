// lib/tournaments.ts
// All tournament/event data now comes from the mobile Supabase project.
import { getMobileSupabase } from "@/lib/server/supabaseMobile"
import type { Event as StaticEvent } from "@/data/events"

// Row shape from the mobile DB tournaments table
export type TournamentRow = {
  id:                  string
  name:                string
  description:         string | null
  start_date:          string
  end_date:            string
  location:            string | null
  time_string:         string | null
  max_players:         number
  prize:               string | null
  entry_fee:           number | null
  points_value:        number
  event_type:          string        // 'tournament' | 'open_play'
  status:              string        // 'registration_open' | 'completed' | 'in_progress' | 'draft'
  is_ranked:           boolean
  accepts_passes:      boolean
  payment_link:        string | null
  image_url:           string | null
  image:               string | null
  current_participants?: number
}

// Map a mobile DB row to the StaticEvent shape the rest of the website uses
function rowToEvent(row: TournamentRow): StaticEvent {
  const isPast = new Date(row.start_date) < new Date()
  return {
    id:                   row.id,
    type:                 row.event_type === "open_play" ? "open-play" : "tournament",
    name:                 row.name,
    date:                 new Date(row.start_date).toLocaleDateString("en-US", {
                            month: "long", day: "numeric", year: "numeric",
                          }),
    time:                 row.time_string ?? "",
    location:             row.location ?? "",
    description:          row.description ?? "",
    image:                row.image_url ?? row.image ?? "/urban-skyball-action.png",
    maxParticipants:      row.max_players,
    currentParticipants:  row.current_participants ?? 0,
    prize:                row.prize ?? undefined,
    registrationFee:      row.entry_fee ? `$${row.entry_fee}` : "Free",
    pointsValue:          row.points_value,
    isPast,
    hasResults:           isPast,
    paymentLink:          row.payment_link ?? undefined,
    date_actual:          row.start_date,
    start_at:             new Date(row.start_date).toISOString(),
  } as StaticEvent
}

/** Fetch all tournaments + open play events */
export async function getAllTournaments(): Promise<StaticEvent[]> {
  const supabase = getMobileSupabase()

  const { data, error } = await supabase
    .from("tournament_with_counts")
    .select("*")
    .neq("status", "draft")
    .order("start_date", { ascending: false })

  if (error) {
    console.error("getAllTournaments error:", error.message)
    return []
  }

  return (data ?? []).map(rowToEvent)
}

/** Fetch a single tournament by ID */
export async function getTournamentById(id: string): Promise<StaticEvent | null> {
  const supabase = getMobileSupabase()

  const { data, error } = await supabase
    .from("tournament_with_counts")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return null
  return rowToEvent(data as TournamentRow)
}

/** Fetch winner/runner-up/score summary for a past tournament */
export async function getTournamentSummary(id: string): Promise<{
  winner: string
  runner_up: string
  score: string
} | null> {
  const supabase = getMobileSupabase()

  const { data, error } = await supabase
    .rpc("get_tournament_summary", { p_tournament_id: id })
    .single()

  if (error || !data) return null
  const summary = data as { winner: string; runner_up: string; score: string }
  return {
    winner:    summary.winner,
    runner_up: summary.runner_up,
    score:     summary.score,
  }
}
