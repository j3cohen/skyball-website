import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { players, calculateRankings } from "@/data/players"
import PlayerTournamentHistory from "@/components/player-tournament-history"

export default function PlayerPage({ params }: { params: { id: string } }) {
  // Find the player by ID
  const player = players.find((p) => p.id === params.id)

  // Calculate rankings to get the player's rank
  const rankedPlayers = calculateRankings(players)
  const rankedPlayer = rankedPlayers.find((p) => p.id === params.id)

  // If player not found, show 404
  if (!player) {
    notFound()
  }

  // Sort tournaments by date (newest first)
  const sortedTournaments = [...player.tournaments].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  // Calculate how many tournaments are counting towards ranking
  const countedTournaments = sortedTournaments.filter((t) => t.countedForRankings)

  // Determine which photo to display (full body or headshot)
  const displayPhoto = player.fullBodyPhoto || player.headshot

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Back Link */}
            <div className="mb-6">
              <Link href="/rankings" className="text-sky-600 hover:text-sky-800">
                ← Back to rankings
              </Link>
            </div>

            {/* Player Profile */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
              <div className="bg-sky-600 p-8 text-white">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  {/* Player Photo - Larger and showing full body if available */}
                  <div className="relative overflow-hidden bg-white border-4 border-white rounded-lg flex-shrink-0">
                    {player.fullBodyPhoto ? (
                      <div className="w-64 h-80">
                        <Image
                          src={displayPhoto || "/placeholder.svg"}
                          alt={player.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 rounded-full">
                        <Image
                          src={displayPhoto || "/placeholder.svg"}
                          alt={player.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <h1 className="text-3xl font-bold">{player.name}</h1>
                      <div className="bg-white text-sky-600 rounded-full px-3 py-1 text-sm font-bold">
                        Rank #{rankedPlayer?.rank || "N/A"}
                      </div>
                    </div>
                    <p className="text-xl mt-2">{player.hometown}</p>

                    {/* Player Stats Section */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Age */}
                      {player.age && (
                        <div className="bg-sky-700/30 rounded-lg p-3">
                          <div className="text-sm opacity-80">Age</div>
                          <div className="text-xl font-semibold">{player.age}</div>
                        </div>
                      )}

                      {/* Record */}
                      {player.record && (
                        <div className="bg-sky-700/30 rounded-lg p-3">
                          <div className="text-sm opacity-80">Record</div>
                          <div className="text-xl font-semibold">{player.record}</div>
                        </div>
                      )}

                      {/* Highest Rank */}
                      {player.highestRank && (
                        <div className="bg-sky-700/30 rounded-lg p-3">
                          <div className="text-sm opacity-80">Highest Rank</div>
                          <div className="text-xl font-semibold">#{player.highestRank.rank}</div>
                          <div className="text-xs opacity-80 mt-1">{player.highestRank.date}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 text-2xl font-bold">{player.totalPoints} points</div>
                  </div>
                </div>
              </div>

              {/* Tournament History with expandable matches */}
              <PlayerTournamentHistory player={player} tournaments={player.tournaments} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
