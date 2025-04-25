import type { Match } from "@/data/matches"
import { CheckCircle2 } from "lucide-react"
import ScrollLink from "./scroll-link"

interface MatchScoreDisplayProps {
  match: Match
  highlightPlayerId?: string
}

export default function MatchScoreDisplay({ match, highlightPlayerId }: MatchScoreDisplayProps) {
  const player1IsWinner = match.winnerId === match.player1.id
  const player2IsWinner = match.winnerId === match.player2.id

  const player1Highlighted = highlightPlayerId === match.player1.id
  const player2Highlighted = highlightPlayerId === match.player2.id

  // Determine if we're on a player profile page
  const isPlayerProfilePage = !!highlightPlayerId

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b text-sm font-medium text-gray-700">{match.round}</div>

      <div className="px-3 py-2">
        <div className="grid grid-cols-[1fr,auto] gap-2">
          {/* Player names and seeds */}
          <div className="space-y-2">
            <div className={`flex items-center ${player1IsWinner ? "font-medium" : ""}`}>
              {player1IsWinner && <CheckCircle2 size={16} className="text-sky-500 mr-1.5 flex-shrink-0" />}
              {player1Highlighted ? (
                <span className="text-sky-700">{match.player1.name}</span>
              ) : (
                <ScrollLink
                  href={`/players/${match.player1.id}`}
                  className={`hover:underline ${player1IsWinner ? "text-sky-600" : ""}`}
                >
                  {match.player1.name}
                </ScrollLink>
              )}
              <span className="text-xs text-gray-500 ml-1">({match.player1.seed})</span>
            </div>

            <div className={`flex items-center ${player2IsWinner ? "font-medium" : ""}`}>
              {player2IsWinner && <CheckCircle2 size={16} className="text-sky-500 mr-1.5 flex-shrink-0" />}
              {player2Highlighted ? (
                <span className="text-sky-700">{match.player2.name}</span>
              ) : (
                <ScrollLink
                  href={`/players/${match.player2.id}`}
                  className={`hover:underline ${player2IsWinner ? "text-sky-600" : ""}`}
                >
                  {match.player2.name}
                </ScrollLink>
              )}
              <span className="text-xs text-gray-500 ml-1">({match.player2.seed})</span>
            </div>
          </div>

          {/* Score display */}
          <div className="flex items-center">
            <div className="grid grid-flow-col gap-1.5">
              {match.sets.map((set, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 flex items-center justify-center border ${
                      set.player1Score > set.player2Score
                        ? (player1Highlighted || !isPlayerProfilePage)
                          ? "bg-sky-100 border-sky-300"
                          : "bg-sky-50 border-sky-200"
                        : "bg-gray-50 border-gray-200"
                    } rounded-t-sm text-sm font-medium`}
                  >
                    {set.player1Score}
                  </div>
                  <div
                    className={`w-8 h-8 flex items-center justify-center border ${
                      set.player2Score > set.player1Score
                        ? (player2Highlighted || !isPlayerProfilePage)
                          ? "bg-sky-100 border-sky-300"
                          : "bg-sky-50 border-sky-200"
                        : "bg-gray-50 border-gray-200"
                    } rounded-b-sm text-sm font-medium`}
                  >
                    {set.player2Score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
