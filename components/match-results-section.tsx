"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import TournamentResultsContent from "@/components/tournament-results-content"

type RawMatchRow = {
  match_id:     string
  round:        string
  player1_slug: string
  player1_seed: number
  player1_name: string
  player2_slug: string
  player2_seed: number
  player2_name: string
  winner_slug:  string
  sets: {
    set_number:    number
    player1Score:  number
    player2Score:  number
  }[]
}

export default function MatchResultsSection({
  tournamentId,
  tournamentName,
  tournamentDate,
}: {
  tournamentId: string
  tournamentName: string
  tournamentDate: string
}) {
  const [rows, setRows] = useState<RawMatchRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .rpc("get_match_details_by_tournament", { p_tournament_id: tournamentId })
      .then((res) => {
        if (res.error) {
          console.error(res.error)
          setError(res.error.message)
        } else {
          // res.data is unknown | null by default, so assert it
          const data = (res.data as RawMatchRow[] | null) || []
          setRows(data)
        }
      })
  }, [tournamentId])

  if (error) return <p className="text-red-600">Error: {error}</p>
  if (rows === null) return <p>Loading match results…</p>
  if (tournamentId === "skyball-100-may-29") return <p>Winner Is Caleb Breslin</p>
  if (rows.length === 0) return <p>No match results available.</p>

  const matches = rows.map((r) => ({
    id: r.match_id,
    round: r.round,
    player1: { id: r.player1_slug, name: r.player1_name, seed: r.player1_seed },
    player2: { id: r.player2_slug, name: r.player2_name, seed: r.player2_seed },
    sets: r.sets.map((s) => ({
      player1Score: s.player1Score,
      player2Score: s.player2Score,
    })),
    winnerId: r.winner_slug,
  }))

  return (
    <TournamentResultsContent
      tournamentId={tournamentId}
      tournamentName={tournamentName}
      tournamentDate={tournamentDate}
      matches={matches}
    />
  )
}
