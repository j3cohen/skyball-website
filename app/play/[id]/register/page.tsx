"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import BuyPassSection from "@/components/buy-pass-section"

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [passes, setPasses]   = useState<{ id: string; quantity_remaining: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string|null>(null)

  useEffect(() => {
    ;(async () => {
      // 1) Ensure logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push(`/login?from=/play/${params.id}/register`)
        return
      }

      // 2) Fetch passes with remaining > 0 for this user
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
  }, [params.id, router])

  const redeemPass = async (passId: string) => {
    setLoading(true)
    setError(null)

    // 3) Call your SECURITY DEFINER function
    const { error } = await supabase.rpc("register_for_tournament", {
      p_tournament_id: params.id,
      p_pass_id:       passId,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/play/${params.id}?registered=1`)
    }
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
              {/* Inline purchase UI */}
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
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
