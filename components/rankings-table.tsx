"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { calculateRankings, type Player } from "@/data/players"
import { players } from "@/data/players"

export default function RankingsTable() {
  const [rankedPlayers, setRankedPlayers] = useState<Player[]>([])

  useEffect(() => {
    setRankedPlayers(calculateRankings(players))
  }, [])

  if (rankedPlayers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-4">Rankings Coming Soon</h2>
        <p className="text-gray-600 mb-4">
          Player rankings will be available after our first tournament (SkyBall™ Open: Lift Off) on April 24, 2025.
        </p>
        <p className="text-gray-600">Check back after the tournament to see the initial player rankings.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-4xl mx-auto">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-sky-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Player</th>
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
              <tr key={player.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-lg font-semibold text-gray-900">{player.rank}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/players/${player.id}`} prefetch={false} className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 mr-4">
                      <Image
                        className="h-10 w-10 rounded-full object-cover"
                        src={player.headshot || "/placeholder.svg?height=40&width=40"}
                        alt={player.name}
                        width={40}
                        height={40}
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-900 hover:text-sky-600 transition-colors">
                      {player.name}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.hometown}</td>
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
