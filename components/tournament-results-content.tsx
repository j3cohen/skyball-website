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
  matches,
}: TournamentResultsContentProps) {
  const matchesByRound: Record<string, Match[]> = {}
  matches.forEach((match) => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = []
    }
    matchesByRound[match.round].push(match)
  })

  const roundOrder = ["Play-in", "Quarter-final", "Semi-final 1", "Semi-final 2", "Final"]
  const sortedRounds = Object.keys(matchesByRound).sort(
    (a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b)
  )

  return (
    <div className="max-w-4xl mx-auto">
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
              For May 15 we again used &quot;King of the Court&quot; for seeding. Wins awarded 2 ranking points each.
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

        {(tournamentId === "lift-off" ||
          tournamentId === "skyball-100-may-15" ||
          tournamentId === "skyball-100-may-20") && (
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Final Rankings</h3>
            <div className="space-y-2">
              {tournamentId === "lift-off" && (
                <>
                  <FinalRankingItem place={1} name="Deven Amann-Rao" points="118 points (100 tournament + 18 seeding)" color="yellow-400" />
                  <FinalRankingItem place={2} name="Isaac Tullis" points="66 points (50 tournament + 16 seeding)" color="gray-300" />
                  <FinalRankingItem place={3} name="Caleb Breslin" points="33 points (25 tournament + 8 seeding)" color="amber-600" />
                  <FinalRankingItem place={4} name="Jason Grossman" points="12 points (seeding only)" color="white" />
                  <FinalRankingItem place={5} name="Will Simon" points="4 points (seeding only)" color="white" />
                </>
              )}

              {tournamentId === "skyball-100-may-15" && (
                <>
                  <FinalRankingItem place={1} name="Jack Smith" points="112 points (100 tournament + 12 seeding)" color="yellow-400" />
                  <FinalRankingItem place={2} name="Jared Barrett" points="64 points (50 tournament + 14 seeding)" color="gray-300" />
                  <FinalRankingItem place={3} name="Will Simon" points="37 points (25 tournament + 12 seeding)" color="amber-600" />
                  <FinalRankingItem place={4} name="Mark Timcenko" points="27 points (25 tournament + 2 seeding)" color="white" />
                  <FinalRankingItem place={5} name="Everett Hollar" points="4 points (seeding only)" color="white" />
                </>
              )}

              {tournamentId === "skyball-100-may-20" && (
                <div className="text-sm space-y-2 text-gray-700">
                  <p>
                    Points were allocated by a single elimination first round that caused 3 out of 6 players to move on
                    to the final round. Then everyone played each other in the final round with the best record deciding
                    the winner, using margin as a tie-breaker.
                  </p>
                  <ul className="mt-3 space-y-2">
                    <li>
                      <strong>1st:</strong> Joe Swenson (50 points) – Round 2: 1-1 record, margin of +3
                    </li>
                    <li>
                      <strong>2nd:</strong> Drew Afromsky (25 points) – Round 2: 1-1 record, margin of -1
                    </li>
                    <li>
                      <strong>3rd:</strong> Ben Poole (25 points) – Round 2: 1-1 record, margin of -2
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FinalRankingItem({
  place,
  name,
  points,
  color,
}: {
  place: number
  name: string
  points: string
  color: string
}) {
  const bgColor =
    color === "white"
      ? "bg-white border border-gray-200 text-gray-500"
      : `bg-${color} text-white`

  return (
    <div className="flex items-center">
      <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center font-bold mr-3`}>
        {place}
      </div>
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-gray-500">{points}</div>
      </div>
    </div>
  )
}
