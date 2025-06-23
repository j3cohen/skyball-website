"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Trophy, Calendar, Target, Plus } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    tournaments: 0,
    players: 0,
    registrations: 0,
    matches: 0,
  })
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch counts for each entity
        const [tournamentsRes, playersRes, registrationsRes, matchesRes] = await Promise.all([
          supabase.from("tournaments").select("id", { count: "exact", head: true }),
          supabase.from("players").select("id", { count: "exact", head: true }),
          supabase.from("registrations").select("id", { count: "exact", head: true }),
          supabase.from("matches").select("id", { count: "exact", head: true }),
        ])

        setStats({
          tournaments: tournamentsRes.count || 0,
          players: playersRes.count || 0,
          registrations: registrationsRes.count || 0,
          matches: matchesRes.count || 0,
        })

        // Fetch recent tournaments for activity
        const { data: recentTournaments } = await supabase
          .from("tournaments")
          .select("id, name, date, location")
          .order("date", { ascending: false })
          .limit(5)

        setRecentActivity(recentTournaments || [])
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: "Total Tournaments",
      value: stats.tournaments,
      icon: Trophy,
      description: "Active and past tournaments",
      href: "/admin/tournaments",
      color: "text-blue-600",
    },
    {
      title: "Total Players",
      value: stats.players,
      icon: Users,
      description: "Registered players",
      href: "/admin/players",
      color: "text-green-600",
    },
    {
      title: "Total Registrations",
      value: stats.registrations,
      icon: Calendar,
      description: "Tournament registrations",
      href: "/admin/registrations",
      color: "text-purple-600",
    },
    {
      title: "Total Matches",
      value: stats.matches,
      icon: Target,
      description: "Completed matches",
      href: "/admin/matches",
      color: "text-orange-600",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Admin Access Confirmed</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>You have successfully accessed the admin dashboard. All systems are operational.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/tournaments" className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <h3 className="font-medium">Create Tournament</h3>
              <p className="text-sm text-gray-600">Set up a new tournament</p>
            </Link>
            <Link href="/admin/players" className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <h3 className="font-medium">Add Player</h3>
              <p className="text-sm text-gray-600">Register a new player</p>
            </Link>
            <Link href="/admin/matches" className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <h3 className="font-medium">Record Match</h3>
              <p className="text-sm text-gray-600">Enter match results</p>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((tournament) => (
                  <div key={tournament.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{tournament.name}</h3>
                      <p className="text-sm text-gray-600">
                        {tournament.date} • {tournament.location}
                      </p>
                    </div>
                    <Link href={`/admin/tournaments`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Manage
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No tournaments found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
