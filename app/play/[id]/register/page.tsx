// app/play/[id]/register/page.tsx
"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import BuyPassSection from "@/components/buy-pass-section"
import { submitRegistration } from "@/app/actions/registration"

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [passes, setPasses]   = useState<{ id: string; quantity_remaining: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // detect any "free 50" tournaments
  const isFree50 = params.id.startsWith("skyball-50-")

  // 1) Ensure logged in & fetch passes (unless it's a free-50)
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push(`/login?from=/play/${params.id}/register`)
        return
      }

      if (isFree50) {
        // no passes to fetch
        setLoading(false)
        return
      }

      // otherwise load your usable passes
      const { data, error } = await supabase
        .from("passes")
        .select("id, quantity_remaining")
        .gt("quantity_remaining", 0)

      if (error) {
        setError(error.message)
      } else {
        setPasses(data ?? [])
      }
      setLoading(false)
    })()
  }, [params.id, router, isFree50])

  // 2) Redeem an existing pass
  const redeemPass = async (passId: string) => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.rpc("register_for_tournament", {
      p_tournament_id: params.id,
      p_pass_id:       passId,
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
      const fullName       = profRes.data?.full_name ?? "(anonymous)"
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

          // — FREE-50 FORM —
          ) : isFree50 ? (
            <form onSubmit={handleFree50} className="space-y-4">
              <input type="hidden" name="tournamentId"   value={params.id} />
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

          // — PASS-AND-BUY FLOW —
          ) : passes.length === 0 ? (
            <div className="space-y-6">
              <p>No valid passes to use for this tournament.</p>
              <BuyPassSection />
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
