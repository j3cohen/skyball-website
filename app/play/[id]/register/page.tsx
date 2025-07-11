// app/play/[id]/register/page.tsx
"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import BuyPassSection from "@/components/buy-pass-section"
import { submitRegistration } from "@/app/actions/registration"
import { ExternalLink } from "lucide-react"

type Tournament = {
  id: string
  name: string
  payment_link: string | null
}

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [passes, setPasses] = useState<{ id: string; quantity_remaining: number }[]>([])
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // detect any "free 50" tournaments
  const isFree50 = params.id.startsWith("skyball-50-")

  // 1) Fetch tournament data and check authentication
  useEffect(() => {
    ;(async () => {
      // First, fetch tournament data to check for payment_link
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("id, name, payment_link")
        .eq("id", params.id)
        .single()

      if (tournamentError) {
        setError("Tournament not found")
        setLoading(false)
        return
      }

      setTournament(tournamentData)

      // Check authentication status
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)

      // If not authenticated and no payment link, redirect to login
      if (!session && !tournamentData.payment_link && !isFree50) {
        router.push(`/login?from=/play/${params.id}/register`)
        return
      }

      if (isFree50) {
        // no passes to fetch
        setLoading(false)
        return
      }

      // If authenticated, load passes
      if (session) {
        const { data, error } = await supabase
          .from("passes")
          .select("id, quantity_remaining")
          .gt("quantity_remaining", 0)

        if (error) {
          setError(error.message)
        } else {
          setPasses(data ?? [])
        }
      }

      setLoading(false)
    })()
  }, [params.id, router, isFree50])

  // 2) Redeem an existing pass (authenticated users only)
  const redeemPass = async (passId: string) => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.rpc("register_for_tournament", {
      p_tournament_id: params.id,
      p_pass_id: passId,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // send telegram alert too
      const [tournRes, profRes] = await Promise.all([
        supabase.from("tournaments").select("name").eq("id", params.id).single(),
        supabase.from("profiles").select("full_name").single(),
      ])

      const tournamentName = tournRes.data?.name ?? params.id
      const fullName = profRes.data?.full_name ?? "(anonymous)"

      await fetch("/api/telegram-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentName, fullName }),
      })

      router.push(`/play/${params.id}?registered=1`)
    }
  }

  // 3) Handle free-50 signup form
  const handleFree50 = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const result = await submitRegistration(form)

    if (result.success) {
      router.push(`/play/${params.id}?registered=1`)
    } else {
      setError(result.message)
      setLoading(false)
    }
  }

  // 4) Handle guest registration (open payment link)
  const handleGuestRegistration = () => {
    if (tournament?.payment_link) {
      window.open(tournament.payment_link, "_blank")
    }
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

              <Button type="submit" disabled={loading}>
                {loading ? "Submitting…" : "Submit Registration"}
              </Button>
            </form>
          ) : (
            // REGULAR TOURNAMENT REGISTRATION OPTIONS
            <div className="space-y-6">
              {/* Guest Registration Option (if payment link exists) */}
              {tournament?.payment_link && (
                <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">Register as Guest</h3>
                  <p className="text-gray-600 mb-4">
                    Register quickly without creating an account. You&apos;ll be redirected to complete payment.
                  </p>
                  <Button onClick={handleGuestRegistration} className="w-full bg-blue-600 hover:bg-blue-700">
                    Continue as Guest
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Separator if both options exist */}
              {tournament?.payment_link && isAuthenticated && (
                <div className="text-center text-gray-500">
                  <span className="bg-white px-4">or</span>
                  <hr className="border-gray-300 -mt-3" />
                </div>
              )}

              {/* Authenticated User Options */}
              {isAuthenticated ? (
                passes.length === 0 ? (
                  <div className="space-y-6">
                    <p>No valid passes to use for this tournament.</p>
                    <BuyPassSection />
                  </div>
                ) : (
                  passes.map((p) => (
                    <div key={p.id} className="mb-4 flex justify-between items-center">
                      <span>
                        {p.quantity_remaining} pass{p.quantity_remaining > 1 ? "es" : ""} remaining
                      </span>
                      <Button onClick={() => redeemPass(p.id)}>Use Pass</Button>
                    </div>
                  ))
                )
              ) : (
                // Show login prompt only if no payment link
                !tournament?.payment_link && (
                  <div className="text-center">
                    <p className="mb-4">You need to log in to register for this tournament.</p>
                    <Button onClick={() => router.push(`/login?from=/play/${params.id}/register`)}>
                      Log In to Continue
                    </Button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
