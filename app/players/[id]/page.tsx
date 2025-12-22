// app/players/[id]/page.tsx
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import PlayerTournamentHistory from "@/components/player-tournament-history"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"
import type { Metadata } from "next"

type PlayerRow = Database["public"]["Tables"]["players"]["Row"]
type PlayerRecordsRow = Database["public"]["Views"]["player_records"]["Row"]
type CurrentRankingsRow = Database["public"]["Views"]["current_rankings"]["Row"]
type PlayerTournamentPointsRow =
  Database["public"]["Tables"]["player_tournament_points"]["Row"] & {
    tournament: Database["public"]["Tables"]["tournaments"]["Row"] | null
  }


export const metadata: Metadata = {
  title: "Player Profile",
  description: "View player profile and tournament history.",
  openGraph: {
    title: "Player Profile",
    description: "View player profile and tournament history.",
    url: "https://skyball.com/players/[slug]",
  },
}

export default async function PlayerPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerComponentClient<Database>({ cookies })

  // —1️⃣ Load the core player row
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select(`
      id,
      name,
      slug,
      birthdate,
      headshot_url,
      fullbody_url,
      hometown
    `)
    .eq("slug", params.id)
    .single<PlayerRow>()

  if (playerError || !player) {
    return notFound()
  }

  // —2️⃣ Load wins/losses from your player_records view
  const { data: rec, error: recError } = await supabase
    .from("player_records")
    .select(`wins, losses`)
    .eq("player_id", player.id)
    .single<PlayerRecordsRow>()

  if (recError && recError.code !== "PGRST116") {
    // PGRST116 = “no rows returned” → treat as 0–0
    throw recError
  }
  const wins = rec?.wins ?? 0
  const losses = rec?.losses ?? 0

  // —3️⃣ Load current rank & total_points from your current_rankings view
  const { data: rankRow, error: rankError } = await supabase
    .from("current_rankings")
    .select(`current_rank, total_points`)
    .eq("player_id", player.id)
    .single<CurrentRankingsRow>()

  if (rankError && rankError.code !== "PGRST116") {
    throw rankError
  }
  const currentRank = rankRow?.current_rank
  const totalPoints = rankRow?.total_points ?? 0

  // —4️⃣ Fetch their tournament‐points (for the history list)
  const { data: ptsRows, error: ptsError } = await supabase
    .from("player_tournament_points")
    .select(`
      points,
      tournament_id,
      tournament: tournaments (
        id,
        name,
        date,
        points_value
      )
    `)
    .eq("player_id", player.id)
    .order("date", { foreignTable: "tournament", ascending: false })
    .returns<PlayerTournamentPointsRow[]>()

  if (ptsError) {
    throw ptsError
  }

  const tournaments = (ptsRows ?? [])
    .filter((r) => r.tournament)
    .map((r) => ({
      id: r.tournament_id,
      name: r.tournament!.name,
      date: r.tournament!.date,
      points: r.points,
      countedForRankings: true,
    }))

  // —5️⃣ Compute age if you want
  let age: number | null = null
  if (player.birthdate) {
    const diff = Date.now() - new Date(player.birthdate).getTime()
    age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }

  // —6️⃣ Render
  const displayPhoto = player.fullbody_url || player.headshot_url || "/placeholder.svg"

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* ← Back */}
            <div className="mb-6">
              <Link href="/rankings" className="text-sky-600 hover:text-sky-800">
                ← Back to rankings
              </Link>
            </div>

            {/* — Profile Card */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
              <div className="bg-sky-600 p-8 text-white">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="relative overflow-hidden bg-white border-4 border-white rounded-lg flex-shrink-0">
                    <div className={player.fullbody_url ? "w-64 h-80" : "w-48 h-48 rounded-full"}>
                      <Image
                        src={displayPhoto}
                        alt={player.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <h1 className="text-3xl font-bold">{player.name}</h1>
                      <div className="bg-white text-sky-600 rounded-full px-3 py-1 text-sm font-bold">
                        Rank #{currentRank ?? "N/A"}
                      </div>
                    </div>
                    <p className="text-xl mt-2">{player.hometown}</p>

                    {/* — Stats Grid */}
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {age !== null && (
                        <div className="bg-sky-700/30 rounded-lg p-3">
                          <div className="text-sm opacity-80">Age</div>
                          <div className="text-xl font-semibold">{age}</div>
                        </div>
                      )}
                      <div className="bg-sky-700/30 rounded-lg p-3">
                        <div className="text-sm opacity-80">Record</div>
                        <div className="text-xl font-semibold">
                          {wins}–{losses}
                        </div>
                      </div>
                      { /* if you have a highest‐ever rank stored somewhere, slot it here */ }
                    </div>

                    <div className="mt-6 text-2xl font-bold">
                      {totalPoints} points
                    </div>
                  </div>
                </div>
              </div>

              {/* — Tournament History */}
              <PlayerTournamentHistory
                player={{
                  id: player.id,
                  slug: player.slug,
                  name: player.name,
                }}
                tournaments={tournaments}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
