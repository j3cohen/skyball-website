// app/play/[id]/register/page.tsx
"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { getMobileSupabaseClient } from "@/lib/supabaseMobileClient"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { submitRegistration } from "@/app/actions/registration"
import RefundPolicyNotice from "@/components/refund-policy-notice"
import { ExternalLink } from "lucide-react"

type Tournament = {
  id: string
  name: string
  payment_link: string | null
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

  // Free-event registration form (prefilled for signed-in users, editable)
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPhone, setRegPhone] = useState("")
  // Set when a guest enters an email that already has an account.
  const [emailHasAccount, setEmailHasAccount] = useState(false)

  // detect any "free 50" tournaments
  const isFree50 = params.id.startsWith("skyball-50-")

  // 1) Fetch tournament + current user + existing registration
  useEffect(() => {
    ;(async () => {
      const mobile = getMobileSupabaseClient()

      const { data: tournamentData, error: tournamentError } = await mobile
        .from("tournaments")
        .select("id, name, payment_link, entry_fee")
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

      // If signed in, check existing registration and prefill the form from
      // the profile (all fields stay editable).
      if (session) {
        setRegEmail((prev) => prev || session.user.email || "")

        const { count } = await mobile
          .from("tournament_entries")
          .select("id", { head: true, count: "exact" })
          .eq("profile_id", session.user.id)
          .eq("tournament_id", params.id)
          .is("cancelled_at", null)
        setAlreadyRegistered((count ?? 0) > 0)

        const { data: prof } = await mobile
          .from("profiles")
          .select("full_name, phone")
          .eq("id", session.user.id)
          .single()
        const p = prof as { full_name?: string | null; phone?: string | null } | null
        if (p?.full_name) setRegName((prev) => prev || p.full_name!)
        if (p?.phone) setRegPhone((prev) => prev || p.phone!)
      }

      setLoading(false)
    })()
  }, [params.id])

  // Returns true if a guest's email already belongs to an account (so we can
  // steer them to log in instead of registering as a guest).
  async function guestEmailHasAccount(email: string): Promise<boolean> {
    try {
      const res = await fetch("/api/account-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      return !!json.exists
    } catch {
      return false
    }
  }

  // Save a free registration. For signed-in users, revive a prior (possibly
  // cancelled) entry instead of inserting a second row — there's a unique
  // constraint on (tournament_id, profile_id) that isn't filtered by
  // cancelled_at, so a fresh insert after cancelling would fail. Returns an
  // error message, or null on success.
  async function saveFreeEntry(guestName: string, guestEmail: string): Promise<string | null> {
    const mobile = getMobileSupabaseClient()

    if (userId) {
      const { data: existing } = await mobile
        .from("tournament_entries")
        .select("id")
        .eq("tournament_id", params.id)
        .eq("profile_id", userId)
        .maybeSingle()

      if (existing) {
        const { error } = await mobile
          .from("tournament_entries")
          .update({
            cancelled_at: null,
            registered_at: new Date().toISOString(),
            payment_method: "free",
            payment_status: "unpaid",
          })
          .eq("id", (existing as { id: string }).id)
        return error?.message ?? null
      }

      const { error } = await mobile.from("tournament_entries").insert({
        tournament_id: params.id,
        profile_id: userId,
        payment_method: "free",
        payment_status: "unpaid",
      })
      return error?.message ?? null
    }

    const { error } = await mobile.from("tournament_entries").insert({
      tournament_id: params.id,
      guest_name: guestName,
      guest_email: guestEmail,
      payment_method: "free",
      payment_status: "unpaid",
    })
    return error?.message ?? null
  }

  // 2) Free-50 signup form
  const handleFree50 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    setEmailHasAccount(false)

    // Validate + notify admin (enforces name/email/phone/dob/zip rules)
    const result = await submitRegistration(form)
    if (!result.success) {
      setError(result.message)
      setSubmitting(false)
      return
    }

    if (!userId && (await guestEmailHasAccount(String(form.get("email") ?? "")))) {
      setEmailHasAccount(true)
      setError("That email already has a SkyBall account. Please log in to register with it.")
      setSubmitting(false)
      return
    }

    // Record the registration in the DB (guest or signed-in), like every other flow
    const saveErr = await saveFreeEntry(
      String(form.get("name") ?? ""),
      String(form.get("email") ?? "")
    )
    if (saveErr) {
      setError(saveErr)
      setSubmitting(false)
      return
    }

    router.push(`/play/${params.id}?registered=1`)
  }

  // 3a) External registration (partner systems like CourtReserve, or a legacy
  //     Stripe payment link). Takes precedence over site checkout.
  const handleExternalLink = () => {
    if (tournament?.payment_link) window.open(tournament.payment_link, "_blank")
  }

  // 3b) Paid events without an external link → site-generated Stripe checkout
  //     (carries tournament_id so the webhook can dual-write revenue + mobile
  //     registration).
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

  // 4) Free / no-link events → registration form. Works for guests (recorded as
  //    a guest entry) and signed-in users (recorded under their profile).
  const handleFreeRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setEmailHasAccount(false)

    if (!userId && (await guestEmailHasAccount(regEmail))) {
      setEmailHasAccount(true)
      setError("That email already has a SkyBall account. Please log in to register with it.")
      setSubmitting(false)
      return
    }

    const saveErr = await saveFreeEntry(regName, regEmail)
    if (saveErr) {
      setError(saveErr)
      setSubmitting(false)
      return
    }

    // Best-effort admin notification (don't block on it)
    const contact = [regName, regPhone, regEmail].filter(Boolean).join(" — ")
    fetch("/api/telegram-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentName: tournament?.name ?? params.id,
        fullName: contact || "(no name)",
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
          ) : tournament?.payment_link ? (
            // EXTERNAL REGISTRATION (CourtReserve / legacy Stripe link)
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Register</h3>
              <p className="text-gray-600 mb-4">
                You&apos;ll be redirected to complete your registration.
              </p>
              <Button onClick={handleExternalLink} className="w-full bg-blue-600 hover:bg-blue-700">
                Continue to Registration
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (tournament?.entry_fee ?? 0) > 0 ? (
            // PAID EVENT (no external link) → site-generated Stripe checkout (guests welcome)
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
              <RefundPolicyNotice />
            </div>
          ) : (
            // FREE EVENT → registration form (guests welcome; prefilled + editable when signed in)
            <form
              onSubmit={handleFreeRegister}
              className="border-2 border-sky-200 bg-sky-50 rounded-lg p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold">Register</h3>

              {!userId && (
                <div className="rounded-md border border-sky-300 bg-white p-3 text-sm">
                  <span className="text-gray-700">Have a SkyBall account? </span>
                  <button
                    type="button"
                    onClick={() => router.push(`/login?from=/play/${params.id}/register`)}
                    className="font-semibold text-sky-700 underline"
                  >
                    Log in
                  </button>{" "}
                  <span className="text-gray-600">to register with it — or continue as a guest below.</span>
                </div>
              )}

              <p className="text-gray-600 text-sm">
                {userId ? "Confirm your details and register." : "Register as a guest:"}
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {emailHasAccount && (
                <Button
                  type="button"
                  onClick={() => router.push(`/login?from=/play/${params.id}/register`)}
                  className="w-full bg-sky-600 hover:bg-sky-700"
                >
                  Log In to Continue
                </Button>
              )}
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-sky-600 hover:bg-sky-700">
                {submitting ? "Registering…" : "Complete Registration"}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
