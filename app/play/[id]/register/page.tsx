// app/play/[id]/register/page.tsx
"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { getMobileSupabaseClient } from "@/lib/supabaseMobileClient"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { submitRegistration } from "@/app/actions/registration"

type Tournament = {
  id: string
  name: string
  entry_fee: number | null
}

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // detect any "free 50" tournaments
  const isFree50 = params.id.startsWith("skyball-50-")

  // 1) Fetch tournament + current user + existing registration
  useEffect(() => {
    ;(async () => {
      const mobile = getMobileSupabaseClient()

      const { data: tournamentData, error: tournamentError } = await mobile
        .from("tournaments")
        .select("id, name, entry_fee")
        .eq("id", params.id)
        .single()

      if (tournamentError) {
        setError("Tournament not found")
        setLoading(false)
        return
      }
      setTournament(tournamentData as Tournament)

      const {
        data: { session },
      } = await mobile.auth.getSession()
      setUserId(session?.user.id ?? null)

      // If signed in, check whether they're already registered
      if (session) {
        const { count } = await mobile
          .from("tournament_entries")
          .select("id", { head: true, count: "exact" })
          .eq("profile_id", session.user.id)
          .eq("tournament_id", params.id)
          .is("cancelled_at", null)
        setAlreadyRegistered((count ?? 0) > 0)
      }

      setLoading(false)
    })()
  }, [params.id])

  // 2) Free-50 signup form
  const handleFree50 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const result = await submitRegistration(form)

    if (result.success) {
      router.push(`/play/${params.id}?registered=1`)
    } else {
      setError(result.message)
      setSubmitting(false)
    }
  }

  // 3) Paid events → site-generated Stripe checkout (carries tournament_id so
  //    the webhook can dual-write revenue + mobile registration).
  const handlePaidRegister = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/event-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: params.id, profileId: userId }),
      })
      const json = await res.json()
      if (res.ok && json.url) {
        window.location.href = json.url as string
      } else {
        setError(json.error ?? "Could not start checkout.")
        setSubmitting(false)
      }
    } catch {
      setError("Network error starting checkout.")
      setSubmitting(false)
    }
  }

  // 4) Free / no-link events → direct registration for signed-in users
  const handleDirectRegister = async () => {
    if (!userId) return
    setSubmitting(true)
    setError(null)

    const mobile = getMobileSupabaseClient()
    const { error: insertErr } = await mobile.from("tournament_entries").insert({
      tournament_id: params.id,
      profile_id: userId,
      payment_method: "free",
      payment_status: "unpaid",
    })

    if (insertErr) {
      setError(insertErr.message)
      setSubmitting(false)
      return
    }

    // Best-effort admin notification (don't block on it)
    const { data: prof } = await mobile
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single()
    fetch("/api/telegram-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentName: tournament?.name ?? params.id,
        fullName: (prof as { full_name?: string } | null)?.full_name ?? "(no name)",
      }),
    }).catch(() => {})

    router.push(`/play/${params.id}?registered=1`)
  }

  return (
    <>
      <Navbar />
      <main className="py-24">
        <div className="container mx-auto max-w-xl">
          <h1 className="text-2xl font-bold mb-4">Register for Tournament</h1>

          {tournament && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-700">{tournament.name}</h2>
            </div>
          )}

          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : isFree50 ? (
            // FREE-50 FORM
            <form onSubmit={handleFree50} className="space-y-4">
              <input type="hidden" name="tournamentId" value={params.id} />
              <input type="hidden" name="tournamentName" value={params.id} />
              <input type="hidden" name="tournamentDate" value="" />

              <div>
                <label className="block text-sm font-medium">Name</label>
                <input name="name" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Email</label>
                <input name="email" type="email" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input name="phone" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">Date of Birth</label>
                <input name="dob" type="date" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium">ZIP Code</label>
                <input name="zip" required className="mt-1 block w-full border rounded p-2" />
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Registration"}
              </Button>
            </form>
          ) : alreadyRegistered ? (
            // Already registered
            <div className="space-y-4">
              <p className="font-medium text-green-700">You&apos;re registered for this event.</p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          ) : (tournament?.entry_fee ?? 0) > 0 ? (
            // PAID EVENT → site-generated Stripe checkout (guests welcome)
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">Register &amp; Pay</h3>
              <p className="text-gray-600">
                Entry fee ${tournament?.entry_fee}. You&apos;ll be taken to secure checkout to complete your registration.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                onClick={handlePaidRegister}
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? "Starting checkout…" : `Register & Pay ($${tournament?.entry_fee})`}
              </Button>
            </div>
          ) : userId ? (
            // DIRECT REGISTRATION (free events, signed in)
            <div className="border-2 border-sky-200 bg-sky-50 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">Register</h3>
              <p className="text-gray-600">Confirm your spot for this event.</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                onClick={handleDirectRegister}
                disabled={submitting}
                className="w-full bg-sky-600 hover:bg-sky-700"
              >
                {submitting ? "Registering…" : "Confirm Registration"}
              </Button>
            </div>
          ) : (
            // Guest on a free / no-link event → must sign in to register
            <div className="text-center space-y-4">
              <p>You need to be signed in to register for this event.</p>
              <Button onClick={() => router.push(`/login?from=/play/${params.id}/register`)}>
                Log In to Continue
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
