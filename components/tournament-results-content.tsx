import Link from "next/link"
import { getMatchesByTournament } from "@/data/matches"
import MatchScoreDisplay from "./match-score-display"

interface TournamentResultsContentProps {
  tournamentId: string
  tournamentName: string
  tournamentDate: string
}

export default function TournamentResultsContent({
  tournamentId,
  tournamentName,
  tournamentDate,
}: TournamentResultsContentProps) {
  const matches = getMatchesByTournament(tournamentId)

  // Group matches by round
  const matchesByRound: Record<string, typeof matches> = {}
  matches.forEach((match) => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = []
    }
    matchesByRound[match.round].push(match)
  })

  // Sort rounds in a logical order
  const roundOrder = ["Play-in", "Quarter-final", "Semi-final", "Final"]
  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/tournaments" className="text-sky-600 hover:text-sky-800">
          ← Back to tournaments
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="bg-sky-600 p-6 text-white">
          <h1 className="text-3xl font-bold">{tournamentName} Results</h1>
          <p className="text-xl mt-2">{tournamentDate}</p>
        </div>

        <div className="p-6">
          {tournamentId === "lift-off" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Seeding Information</h3>
              <p className="text-sm text-amber-700 mb-3">
                As this was our first tournament, we used a "King of the Court" format to determine seeding. Players
                competed in first-to-two-points matches, with winners staying on court and earning points.
              </p>
              <div className="bg-white rounded p-3">
                <h4 className="font-medium text-sm mb-2">King of the Court Results:</h4>
                <ul className="text-sm space-y-1">
                  <li>Deven - 9 wins (18 points)</li>
                  <li>Isaac - 8 wins (16 points)</li>
                  <li>Jason - 6 wins (12 points)</li>
                  <li>Caleb - 4 wins (8 points)</li>
                  <li>Will - 2 wins (4 points)</li>
                </ul>
              </div>
            </div>
          )}

          {sortedRounds.map((round) => (
            <div key={round} className="mb-8">
              <h2 className="text-xl font-bold mb-4">{round}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchesByRound[round].map((match) => (
                  <MatchScoreDisplay key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Final Rankings</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  1
                </div>
                <div>
                  <div className="font-medium">Deven Amann-Rao</div>
                  <div className="text-sm text-gray-500">118 points (100 tournament + 18 seeding)</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  2
                </div>
                <div>
                  <div className="font-medium">Isaac Tullis</div>
                  <div className="text-sm text-gray-500">66 points (50 tournament + 16 seeding)</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                  3
                </div>
                <div>
                  <div className="font-medium">Caleb Breslin</div>
                  <div className="text-sm text-gray-500">33 points (25 tournament + 8 seeding)</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3">
                  4
                </div>
                <div>
                  <div className="font-medium">Jason Grossman</div>
                  <div className="text-sm text-gray-500">12 points (seeding only)</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3">
                  5
                </div>
                <div>
                  <div className="font-medium">Will Simon</div>
                  <div className="text-sm text-gray-500">4 points (seeding only)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
