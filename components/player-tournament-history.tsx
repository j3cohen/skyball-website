// components/player-tournament-history.tsx
"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"
import MatchScoreDisplay, { type Match as DisplayMatch } from "./match-score-display"
import ScrollLink from "./scroll-link"

type MatchDetailsArgs =
  Database["public"]["Functions"]["get_match_details_by_tournament"]["Args"]

// type MatchDetailsReturn =
//   Database["public"]["Functions"]["get_match_details_by_tournament"]["Returns"]


// Raw RPC row including seeds and sets
interface MatchRow {
  match_id:      string
  round:         string
  player1_slug:  string
  player1_name:  string
  player1_seed:  number
  player2_slug:  string
  player2_name:  string
  player2_seed:  number
  winner_slug:   string
  sets: {
    set_number:   number
    player1Score: number
    player2Score: number
  }[]
}


interface Tournament {
  id: string
  name: string
  date: string
  points: number
  countedForRankings: boolean
}
interface Player {
  id: string
  slug: string
  name: string
}

interface Props {
  player: Player
  tournaments: Tournament[]
}

export default function PlayerTournamentHistory({
  player,
  tournaments,
}: Props) {
  const supabase = createClientComponentClient<Database>()
  const [expanded, setExpanded] = useState<string | null>(null)
  // Map tournament -> matches or null while loading
  const [matchesByTour, setMatchesByTour] = useState<Record<string, DisplayMatch[] | null>>({})

  async function toggle(tid: string) {
    if (expanded === tid) {
      setExpanded(null)
      return
    }
    setExpanded(tid)

    if (matchesByTour[tid] === undefined) {
      setMatchesByTour(prev => ({ ...prev, [tid]: null }))
      const args = { p_tournament_id: tid } satisfies MatchDetailsArgs
      const { data, error: rpcError } = await supabase.rpc("get_match_details_by_tournament", args)

      if (rpcError) {
        console.error("RPC error:", rpcError)
        setMatchesByTour(prev => ({ ...prev, [tid]: [] }))
        return
      }

      const rows: MatchRow[] = (data ?? []).map((row: unknown) => {
        const r = row as {
          match_id: string
          round: string
          player1_slug: string
          player1_name: string
          player1_seed: number
          player2_slug: string
          player2_name: string
          player2_seed: number
          winner_slug: string
          sets: string | { set_number: number; player1Score: number; player2Score: number }[]
        }
        return {
          ...r,
          sets: Array.isArray(r.sets) ? r.sets : JSON.parse(r.sets as string),
        }
      })

      const matches: DisplayMatch[] = rows
        .filter(r => r.player1_slug === player.slug || r.player2_slug === player.slug)
        .map(r => ({
          id:       r.match_id,
          round:    r.round,
          player1:  { id: r.player1_slug, name: r.player1_name, seed: r.player1_seed },
          player2:  { id: r.player2_slug, name: r.player2_name, seed: r.player2_seed },
          winnerId: r.winner_slug,
          sets:     r.sets.map(s => ({
            player1Score: s.player1Score,
            player2Score: s.player2Score,
          })),
        }))
      console.debug("Mapped matches for tournament", tid, matches)

      setMatchesByTour(prev => ({ ...prev, [tid]: matches }))
    }
  }

  const countedCount = tournaments.filter(t => t.countedForRankings).length

  // auto-expand first tournament for debug
  useEffect(() => {
    if (tournaments.length > 0 && expanded === null) {
      toggle(tournaments[0].id)
    }
  }, [tournaments])

  return (
    <div className="p-8 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-2">Tournament History</h2>
      <p className="text-gray-600 mb-6">
        Showing {tournaments.length} total, {countedCount} counted for rankings
      </p>

      <div className="space-y-4">
        {tournaments.map(t => {
          const isOpen = expanded === t.id
          const matches = matchesByTour[t.id]
          return (
            <div key={t.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(t.id)}
                className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-lg">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.date}</div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sky-600 font-semibold">
                    {t.points}pt{t.points !== 1 && "s"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.countedForRankings ? "Counted" : "Not counted"}
                  </div>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {isOpen && (
                <div className="bg-gray-50 border-t px-4 py-3">
                  {matches === null && <p className="text-gray-500 italic">Loading matches…</p>}
                  {matches !== null && matches.length === 0 && <p className="text-gray-500 italic">No matches recorded.</p>}
                  {Array.isArray(matches) && matches.length > 0 && (
                    <div className="space-y-2">
                      {matches.map(m => (
                        <MatchScoreDisplay
                          key={m.id}
                          match={m}
                          highlightPlayerId={player.id}
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 text-right">
                    <ScrollLink
                      href={`/play/${t.id}`}
                      className="text-sky-600 hover:text-sky-800 text-sm font-medium"
                    >
                      View full tournament results →
                    </ScrollLink>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {tournaments.length === 0 && <p className="text-gray-500 italic">No tournaments found.</p>}
      </div>
    </div>
  )
}
