// app/play/[id]/register/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import BuyPassSection from "@/components/buy-pass-section"
import { AuthCompact } from "@/components/auth-compact"

// Augment pass type to include name label
interface RedeemablePass {
  id: string
  name: string
  quantity_remaining: number
}

export default function RegisterPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<boolean | null>(null)
  const [passes, setPasses] = useState<RedeemablePass[]>([])
  const [requiredLevel, setRequiredLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1) check auth state once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, sesh) => {
      setSession(!!sesh)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 2) once signed-in, load passes and tournament info
  useEffect(() => {
    if (session === null) return  // still determining
    if (!session) {
      setLoading(false)
      return
    }

    ;(async () => {
      setLoading(true)
      setError(null)

      // fetch tournament level
      const { data: tourn, error: tErr } = await supabase
        .from('tournaments')
        .select('points_value')
        .eq('id', params.id)
        .single()
      if (tErr || !tourn) {
        setError('Could not load tournament info.')
        setLoading(false)
        return
      }
      const level = tourn.points_value
      setRequiredLevel(level)

      // fetch all your non-depleted passes with their types
      const { data: allPasses, error: pErr } = await supabase
        .from('passes')
        .select(
          'id, quantity_remaining, pass_type:pass_types(id, name, points_value)'
        )
        .gt('quantity_remaining', 0)

      if (pErr) {
        setError(pErr.message)
      } else {
        // filter to only those matching this tournament's level
        const valid = (allPasses ?? []).filter(
          (row) => Array.isArray(row.pass_type) && row.pass_type.length > 0 && row.pass_type[0].points_value === level
        )
        // map to include name label
        const formatted = valid.map((row) => ({
          id: row.id,
          name: Array.isArray(row.pass_type) ? row.pass_type[0].name : '',
          quantity_remaining: row.quantity_remaining,
        }))
        setPasses(formatted)
      }
      setLoading(false)
    })()
  }, [session, params.id])

  const redeemPass = async (passId: string) => {
    setLoading(true)
    setError(null)
    const { error: rpcErr } = await supabase.rpc('register_for_tournament', {
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

  // --- RENDER ---

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
                  {p.name}: {p.quantity_remaining} pass{p.quantity_remaining > 1 ? 'es' : ''} remaining
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
