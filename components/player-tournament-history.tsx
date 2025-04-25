"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Player, Tournament } from "@/data/players"
import { getMatchesByPlayerAndTournament } from "@/data/matches"
import MatchScoreDisplay from "./match-score-display"
import ScrollLink from "./scroll-link"

interface PlayerTournamentHistoryProps {
  player: Player
  tournaments: Tournament[]
}

export default function PlayerTournamentHistory({ player, tournaments }: PlayerTournamentHistoryProps) {
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null)

  // Calculate how many tournaments are counting towards ranking
  const countedTournaments = tournaments.filter((t) => t.countedForRankings)

  const toggleTournament = (tournamentId: string) => {
    if (expandedTournament === tournamentId) {
      setExpandedTournament(null)
    } else {
      setExpandedTournament(tournamentId)
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Tournament History</h2>
      <p className="text-gray-600 mb-6">
        Total Points: {player.totalPoints} (based on top {countedTournaments.length}
        {countedTournaments.length === 1 ? " tournament" : " tournaments"})
      </p>

      <div className="space-y-4">
        {tournaments.map((tournament) => {
          const isExpanded = expandedTournament === tournament.id
          const matches = getMatchesByPlayerAndTournament(player.id, tournament.id)
          const hasMatches = matches.length > 0

          return (
            <div key={tournament.id} className="border rounded-lg overflow-hidden">
              <div
                className={`px-4 py-3 flex justify-between items-center cursor-pointer ${hasMatches ? "hover:bg-gray-50" : ""}`}
                onClick={() => hasMatches && toggleTournament(tournament.id)}
              >
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div>
                      <div className="font-medium">{tournament.name}</div>
                      <div className="text-sm text-gray-500">{tournament.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sky-600">{tournament.points} points</div>
                      <div className="text-xs text-gray-500">
                        {tournament.countedForRankings ? "Counted for rankings" : "Not counted"}
                      </div>
                    </div>
                  </div>
                </div>
                {hasMatches && (
                  <div className="ml-4">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                )}
              </div>

              {isExpanded && hasMatches && (
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <h3 className="font-medium mb-3">Match Results</h3>
                  <div className="space-y-3">
                    {matches.map((match) => (
                      <MatchScoreDisplay key={match.id} match={match} highlightPlayerId={player.id} />
                    ))}
                  </div>

                  <div className="mt-4 text-right">
                    <ScrollLink
                      href={`/play/${tournament.id}`}
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
      </div>

      {/* Explanation of ranking calculation */}
      <div className="bg-gray-50 p-4 mt-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Ranking Calculation</h3>
        <p className="text-sm text-gray-600">
          Player rankings are based on their top 10 tournament performances over a rolling 12-month period. Points
          earned in each tournament depend on the tournament category and the player's final position.
        </p>
      </div>
    </div>
  )
}
