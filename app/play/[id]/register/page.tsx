// app/play/[id]/register/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import BuyPassSection from "@/components/buy-pass-section"

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [passes, setPasses] = useState<{ id: string; quantity_remaining: number }[]>([])
  const [requiredLevel, setRequiredLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)

      // 1) create auth-aware client & ensure logged in
      const supabase = createClientComponentClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push(`/login?from=/play/${params.id}/register`)
        return
      }

      // 2) fetch this tournament's required level
      const { data: tourn, error: tournError } = await supabase
        .from("tournaments")
        .select("points_value")
        .eq("id", params.id)
        .single()
      if (tournError || !tourn) {
        setError("Could not load tournament info.")
        setLoading(false)
        return
      }
      const level = tourn.points_value
      setRequiredLevel(level)

      // 3) fetch all your non-zero passes (RLS applies user filter)
      const { data: allPasses, error: passError } = await supabase
        .from("passes")
        .select("id, quantity_remaining, pass_types(points_value)")
        .gt("quantity_remaining", 0)

      if (passError) {
        setError(passError.message)
      } else {
        // 4) filter to only those matching this level
        const valid = (allPasses ?? []).filter(
          (p) => p.pass_types?.[0]?.points_value === level
        )
        setPasses(
          valid.map((p) => ({
            id: p.id,
            quantity_remaining: p.quantity_remaining,
          }))
        )
      }

      setLoading(false)
    })()
  }, [params.id, router])

  const redeemPass = async (passId: string) => {
    setLoading(true)
    setError(null)
    const supabase = createClientComponentClient()

    // call the SECURITY DEFINER function
    const { error: rpcError } = await supabase.rpc("register_for_tournament", {
      p_tournament_id: params.id,
      p_pass_id: passId,
    })
    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    // optional: send Telegram alert
    const [tournRes, profileRes] = await Promise.all([
      supabase.from("tournaments").select("name").eq("id", params.id).single(),
      supabase.from("profiles").select("full_name").single(),
    ])
    const tournamentName = tournRes.data?.name ?? "(unknown tournament)"
    const fullName = profileRes.data?.full_name ?? "(unknown player)"
    await fetch("/api/telegram-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentName, fullName }),
    })

    router.push(`/play/${params.id}?registered=1`)
  }

  return (
    <>
      <Navbar />

      <main className="py-24">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold mb-4">Register for Tournament</h1>

          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : passes.length === 0 ? (
            <div className="space-y-6">
              <p>No valid passes to use for this tournament.</p>
              {requiredLevel != null && <BuyPassSection requiredLevel={requiredLevel} />}
            </div>
          ) : (
            passes.map((p) => (
              <div key={p.id} className="mb-4 flex justify-between items-center">
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
