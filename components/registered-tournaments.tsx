// components/registered-tournaments.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getMobileSupabaseClient } from "@/lib/supabaseMobileClient"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import RefundPolicyNotice from "@/components/refund-policy-notice"

// Registrations live in the mobile project's tournament_entries table
// (profile_id / cancelled_at), joined to the tournament.
type TournamentJoin = { id: string; name: string; start_date: string; entry_fee: number | null }
type RawRegistration = {
  id: string
  registered_at: string
  tournament: TournamentJoin[] | TournamentJoin | null
}

type Registration = {
  id: string
  tournament: {
    id: string
    name: string
    date: string
    startDate: string
    entryFee: number | null
  }
}

export default function RegisteredTournaments() {
  const [items, setItems] = useState<Registration[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const mobile = getMobileSupabaseClient()
      const {
        data: { session },
      } = await mobile.auth.getSession()

      if (!session) {
        setItems([])
        setLoading(false)
        return
      }
      setUserId(session.user.id)

      const { data, error } = await mobile
        .from("tournament_entries")
        .select(`
          id,
          registered_at,
          tournament: tournaments (
            id,
            name,
            start_date,
            entry_fee
          )
        `)
        .eq("profile_id", session.user.id)
        .is("cancelled_at", null)
        .order("registered_at", { ascending: false })

      if (error) {
        console.error("Error loading registrations:", error)
        setItems([])
      } else if (data) {
        const raw = data as unknown as RawRegistration[]
        const clean: Registration[] = raw
          .map((r) => {
            const t = Array.isArray(r.tournament) ? r.tournament[0] : r.tournament
            if (!t) return null
            return {
              id: r.id,
              tournament: {
                id: t.id,
                name: t.name,
                date: new Date(t.start_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }),
                startDate: t.start_date,
                entryFee: t.entry_fee,
              },
            }
          })
          .filter((r): r is Registration => r !== null)

        // filter out past tournaments
        const now = new Date()
        const upcoming = clean.filter((r) => {
          const dt = new Date(r.tournament.startDate)
          return !isNaN(dt.valueOf()) && dt >= now
        })

        setItems(upcoming)
      }

      setLoading(false)
    }

    load()
  }, [])

  async function handleCancel(reg: Registration) {
    const paid = (reg.tournament.entryFee ?? 0) > 0
    const hoursUntil = (new Date(reg.tournament.startDate).getTime() - Date.now()) / 3_600_000
    const refundEligible = paid && hoursUntil > 36

    const confirmMsg = !paid
      ? `Cancel your registration for ${reg.tournament.name}?`
      : refundEligible
        ? `Cancel your registration for ${reg.tournament.name}? You're more than 36 hours out, so you'll be refunded your entry fee less a 20% service fee.`
        : `Cancel your registration for ${reg.tournament.name}? You're within 36 hours of the event, so the entry fee is non-refundable. You can email info@skyball.us to request a credit toward a future tournament.`

    if (!window.confirm(confirmMsg)) return

    setCancelling(reg.id)
    const mobile = getMobileSupabaseClient()
    const { error } = await mobile
      .from("tournament_entries")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", reg.id)
      .eq("profile_id", userId ?? "")

    if (error) {
      alert(`Could not cancel: ${error.message}`)
      setCancelling(null)
      return
    }

    // Notify admin (paid cancellations need a refund/credit decision)
    if (paid) {
      const { data: prof } = await mobile
        .from("profiles")
        .select("full_name")
        .eq("id", userId ?? "")
        .single()
      fetch("/api/telegram-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading: "TOURNAMENT CANCELLATION",
          tournamentName: reg.tournament.name,
          fullName: (prof as { full_name?: string } | null)?.full_name ?? "(account holder)",
          note: refundEligible
            ? "Refund due: entry fee less 20% service fee (>36h before event)."
            : "No refund (within 36h). Credit on request.",
        }),
      }).catch(() => {})
    }

    setItems((prev) => prev.filter((x) => x.id !== reg.id))
    setCancelling(null)

    const confirmationNote = !paid
      ? ""
      : refundEligible
        ? " A refund (entry fee less 20% service fee) will be processed."
        : " Within 36 hours of the event, so it's non-refundable — email info@skyball.us to request a credit."
    setNotice(`Registration for ${reg.tournament.name} cancelled.${confirmationNote}`)
    window.setTimeout(() => setNotice(null), 8000)
  }

  if (loading) {
    return <p>Loading your registrations…</p>
  }
  return (
    <div className="space-y-3">
      {notice && (
        <div className="rounded-md bg-green-50 text-green-700 px-4 py-2 text-sm flex items-start justify-between gap-3">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-green-700/60 hover:text-green-700"
          >
            ✕
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p>You&rsquo;re not registered for any upcoming tournaments yet.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Upcoming Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {items.map((r) => {
                const paid = (r.tournament.entryFee ?? 0) > 0
                return (
                  <li key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/play/${r.tournament.id}`} className="text-sky-600 hover:underline">
                        {r.tournament.name}
                      </Link>{" "}
                      on {r.tournament.date}
                      {paid && <RefundPolicyNotice className="mt-1" />}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancelling === r.id}
                      onClick={() => handleCancel(r)}
                    >
                      {cancelling === r.id ? "Cancelling…" : "Cancel"}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
