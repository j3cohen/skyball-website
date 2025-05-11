"use client"

import { useState, useEffect } from "react"
import { supabase }       from "@/lib/supabaseClient"
import { useRouter }       from "next/navigation"

import Profile                       from "@/components/profile"
import RegisteredTournaments         from "@/components/registered-tournaments"
import AvailableTournamentPasses     from "@/components/available-tournament-passes"
import PurchaseTournamentPasses      from "@/components/buy-pass-section"
import TournamentPassHistory         from "@/components/tournament-pass-history"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import UpcomingTournaments           from "@/components/upcoming-tournaments"
import { DashboardNotifications }    from "@/components/dashboard-notifications"



export default function DashboardContent() {
  const [profile, setProfile]   = useState<{ full_name?: string; phone?: string; hometown?: string } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [version, setVersion]   = useState(0)
  const router = useRouter()

  // 1) Load the current user's profile
  const loadProfile = async () => {
    setLoading(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setProfile(null)
      setLoading(false)
      router.replace(`/login?from=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, hometown")
      .eq("id", session.user.id)
      .single()

    if (error) {
      console.error("Error loading profile:", error)
      setProfile(null)
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  // re-fetch on mount and whenever we bump `version`
  useEffect(() => {
    loadProfile()
  }, [version])

  if (loading) {
    return <p className="text-center py-12">Loading your dashboard…</p>
  }

  // 2) Check completeness
  const incomplete =
    !profile ||
    !profile.full_name?.trim() ||
    !profile.phone?.trim() ||
    !profile.hometown?.trim()

  return (
    <>
    <DashboardNotifications />

    <div className="space-y-8">
      {/* >>> Show this at top if profile is incomplete */}
      {incomplete && (
        <Card>
          <CardHeader>
            <CardTitle>Please Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Profile onSave={() => setVersion((v) => v + 1)} />
          </CardContent>
        </Card>
      )}

      {/* >>> The rest of your dashboard */}
      <RegisteredTournaments />
      <UpcomingTournaments />
      <AvailableTournamentPasses />
      <PurchaseTournamentPasses />
      <TournamentPassHistory />

      {/* >>> Once profile is complete, render it again at the bottom */}
      {!incomplete && (
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Profile onSave={() => setVersion((v) => v + 1)} />
          </CardContent>
        </Card>
      )}
    </div>
    </>
  )
}
