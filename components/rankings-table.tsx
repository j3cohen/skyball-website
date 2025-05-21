// components/rankings-table.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"

interface Player {
  slug:        string
  rank:        number
  totalPoints: number
  name:        string
  headshot:    string
  hometown:    string
}

export default function RankingsTable() {
  const supabase = createClientComponentClient<Database>()
  const [rankedPlayers, setRankedPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function loadRankings() {
      setLoading(true)
      const { data, error } = await supabase
        .from("current_rankings")
        .select(`
          player_id,
          total_points,
          current_rank,
          players (
            slug,
            name,
            headshot_url,
            hometown
          )
        `)
        .gt("total_points", 0)
        .order("current_rank", { ascending: true })

      if (error) {
        setError(error.message)
      } else if (data) {
        setRankedPlayers(
          data.map((row) => ({
            slug:        row.players!.slug,
            rank:        row.current_rank ?? 0,
            totalPoints: row.total_points ?? 0,
            name:        row.players!.name,
            headshot:    row.players!.headshot_url || "/placeholder.svg",
            hometown:    row.players!.hometown ?? "",
          }))
        )
      }
      setLoading(false)
    }

    loadRankings()
  }, [supabase])

  if (loading) {
    return <p className="text-center py-8">Loading rankings…</p>
  }
  if (error) {
    return <p className="text-red-600 text-center py-8">Error: {error}</p>
  }
  if (rankedPlayers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-4">Rankings Coming Soon</h2>
        <p className="text-gray-600 mb-4">
          No ranking data is available yet. Check back after our next tournament!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-4xl mx-auto">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-sky-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                Hometown
              </th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rankedPlayers.map((player) => (
              <tr key={player.slug} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-lg font-semibold text-gray-900">
                  {player.rank}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/players/${player.slug}`}
                    prefetch={false}
                    className="flex items-center"
                  >
                    <div className="h-10 w-10 flex-shrink-0 mr-4">
                      <Image
                        src={player.headshot}
                        alt={player.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-900 hover:text-sky-600 transition-colors">
                      {player.name}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {player.hometown}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-lg font-semibold text-sky-600">
                  {player.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
