// This component displays the results of a tournament, including match scores and player rankings.
import MatchScoreDisplay from "@/components/match-score-display"

interface PlayerInMatch {
  id: string
  name: string
  seed: number
}

interface Set {
  player1Score: number
  player2Score: number
}

interface Match {
  id: string
  round: string
  player1: PlayerInMatch
  player2: PlayerInMatch
  sets: Set[]
  winnerId: string
}

interface TournamentResultsContentProps {
  tournamentId: string
  tournamentName: string
  tournamentDate: string
  matches: Match[]
}

export default function TournamentResultsContent({
  tournamentId,
  tournamentName,
  tournamentDate,
  matches,
}: TournamentResultsContentProps) {
  // Group matches by round
  const matchesByRound: Record<string, Match[]> = {}
  matches.forEach((match) => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = []
    }
    matchesByRound[match.round].push(match)
  })

  // Sort rounds in a logical order
  const roundOrder = ["Play-in", "Quarter-final", "Semi-final 1", "Semi-final 2", "Final"]
  const sortedRounds = Object.keys(matchesByRound).sort(
    (a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b)
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* <div className="mb-6">
        <Link href="/play" className="text-sky-600 hover:text-sky-800">
          ← Back to all events
        </Link>
      </div> */}
{/* 
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="bg-sky-600 p-6 text-white">
          <h1 className="text-3xl font-bold">{tournamentName} Results</h1>
          <p className="text-xl mt-2">{tournamentDate}</p>
        </div> */}

        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4"> Match Results</h1>

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

          {tournamentId === "lift-off" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Seeding Information</h3>
              <p className="text-sm text-amber-700 mb-3">
                As this was our first tournament, we used a &quot;King of the Court&quot; format to determine seeding.
                Players competed in first-to-two-points matches, with winners staying on court and earning points.
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

          {tournamentId === "skyball-100-may-15" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Seeding Information</h3>
              <p className="text-sm text-amber-700 mb-3">
                For May 15 we again used &quot;King of the Court&quot; for seeding. Wins awarded
                2 ranking points each.
              </p>
              <div className="bg-white rounded p-3">
                <h4 className="font-medium text-sm mb-2">King of the Court Results:</h4>
                <ul className="text-sm space-y-1">
                  <li>Jared - 7 wins (14 points)</li>
                  <li>Will - 6 wins (12 points)</li>
                  <li>Jack - 6 wins (12 points)</li>
                  <li>Everett - 2 wins (4 points)</li>
                  <li>Mark - 1 win (2 points)</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Final Rankings</h3>
            <div className="space-y-2">
              {tournamentId === "lift-off" ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      1
                    </div>
                    <div>
                      <div className="font-medium">Jack Smith</div>
                      <div className="text-sm text-gray-500">112 points (100 tournament + 12 seeding)</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      2
                    </div>
                    <div>
                      <div className="font-medium">Jared Barrett</div>
                      <div className="text-sm text-gray-500">64 points (50 tournament + 14 seeding)</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      3
                    </div>
                    <div>
                      <div className="font-medium">Will Simon</div>
                      <div className="text-sm text-gray-500">37 points (25 tournament + 12 seeding)</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3">
                      4
                    </div>
                    <div>
                      <div className="font-medium">Mark Timcenko</div>
                      <div className="text-sm text-gray-500">27 points (25 tournament + 2 seeding)</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold mr-3">
                      5
                    </div>
                    <div>
                      <div className="font-medium">Everett Hollar</div>
                      <div className="text-sm text-gray-500">4 points (seeding only)</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      {/* </div> */}
    </div>
  )
}
