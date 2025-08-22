// app/players/[slug]/page.tsx
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
  type PlayerRow = Database["public"]["Tables"]["players"]["Row"]

  const { data: playerData, error: playerError } = await supabase
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
    .single()

  const player = playerData as PlayerRow | null

  if (playerError || !player) {
    return notFound()
  }

  // —2️⃣ Load wins/losses from your player_records view
  // define an explicit type for the returned row so TypeScript doesn't infer `never`
  type PlayerRecordRow = {
    wins: number
    losses: number
  }

  const { data: recData, error: recError } = await supabase
    .from("player_records")
    .select(`wins, losses`)
    .eq("player_id", player.id)
    .single()

  if (recError && recError.code !== "PGRST116") {
    // PGRST116 = “no rows returned” → treat as 0–0 
    throw recError
  }

  // cast the raw response to the explicit row type (or null)
  const rec = recData as PlayerRecordRow | null

  const wins = rec?.wins ?? 0
  const losses = rec?.losses ?? 0

  // —3️⃣ Load current rank & total_points from your current_rankings view
  type RankRow = {
    current_rank: number | null
    total_points: number | null
  }

  const { data: rankRowRaw, error: rankError } = await supabase
    .from("current_rankings")
    .select(`current_rank, total_points`)
    .eq("player_id", player.id)
    .single()

  if (rankError && rankError.code !== "PGRST116") {
    throw rankError
  }

  const rankRow = rankRowRaw as RankRow | null
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

  if (ptsError) {
    throw ptsError
  }

  const tournaments = (ptsRows ?? []).map((r) => ({
    id: r.tournament_id,
    name: r.tournament.name!,
    date: r.tournament.date!,
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
