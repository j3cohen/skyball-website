// app/play/[id]/register/page.tsx
"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import BuyPassSection from "@/components/buy-pass-section"
import { AuthCompact } from "@/components/auth-compact"
import { submitRegistration } from "@/app/actions/registration"

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [session, setSession] = useState<boolean | null>(null)
  const [passes, setPasses] = useState<{ id: string; quantity_remaining: number }[]>([])
  const [requiredLevel, setRequiredLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isFree50 = params.id.startsWith("skyball-50-")

  // 1) check auth state once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(!!s)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  // 2) load either "free" form or pass flow
  useEffect(() => {
    if (session === null) return
    if (!session) {
      setLoading(false)
      return
    }

    if (isFree50) {
      // nothing else to fetch
      setLoading(false)
      return
    }

    ;(async () => {
      setLoading(true)
      setError(null)

      // fetch tournament level
      const { data: tourn, error: tErr } = await supabase
        .from("tournaments")
        .select("points_value")
        .eq("id", params.id)
        .single()
      if (tErr || !tourn) {
        setError("Could not load tournament info.")
        setLoading(false)
        return
      }
      setRequiredLevel(tourn.points_value)

      // fetch passes at that level
      const { data: allPasses, error: pErr } = await supabase
        .from("passes")
        .select("id, quantity_remaining, pass_types(points_value)")
        .gt("quantity_remaining", 0)
        .eq("pass_types.points_value", tourn.points_value)

      if (pErr) setError(pErr.message)
      else {
        setPasses(
          (allPasses ?? []).map((p) => ({
            id: p.id,
            quantity_remaining: p.quantity_remaining,
          }))
        )
      }
      setLoading(false)
    })()
  }, [session, params.id, isFree50, supabase])

  // Redeem RPC
  const redeemPass = async (passId: string) => {
    setLoading(true)
    const { error: rpcErr } = await supabase.rpc("register_for_tournament", {
      p_tournament_id: params.id,
      p_pass_id: passId,
    })
    if (rpcErr) {
      setError(rpcErr.message)
      setLoading(false)
    } else {
      router.push(`/play/${params.id}?registered=1`)
    }
  }

  // Handle free‐50 form submit
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

  if (session === null) {
    return <p className="text-center py-16">Checking authentication…</p>
  }

  if (!session) {
    return (
      <>
        <Navbar />
        <main className="py-24">
          <div className="container mx-auto text-center">
            <p className="mb-6">Please sign in to register for this tournament.</p>
            <AuthCompact />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="py-24">
        <div className="container mx-auto max-w-xl">
          <h1 className="text-2xl font-bold mb-4">Register for Tournament</h1>

          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : isFree50 ? (
            // — FREE 50-LEVEL SIGNUP FORM —
            <form onSubmit={handleFree50} className="space-y-4">
              <input type="hidden" name="tournamentId" value={params.id} />
              <input
                type="hidden"
                name="tournamentName"
                value={encodeURI(params.id)} // or fetch proper name if needed
              />
              <input
                type="hidden"
                name="tournamentDate"
                value={""} // you can inject date via a prop or fetch it
              />

              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  name="name"
                  required
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input
                  name="phone"
                  required
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Date of Birth</label>
                <input
                  name="dob"
                  type="date"
                  required
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting…" : "Submit Registration"}
              </Button>
            </form>
          ) : passes.length === 0 ? (
            // — NORMAL PASS / STRIPE FLOW —
            <div className="space-y-6">
              <p>No valid passes to use for this tournament.</p>
              {requiredLevel != null && (
                <BuyPassSection />
              )}
            </div>
          ) : (
            passes.map((p) => (
              <div
                key={p.id}
                className="mb-4 flex justify-between items-center"
              >
                <span>
                  {p.quantity_remaining} pass
                  {p.quantity_remaining > 1 ? "es" : ""} remaining
                </span>
                <Button onClick={() => redeemPass(p.id)}>Use Pass</Button>
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
