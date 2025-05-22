// components/redeem-pass-section.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { Database } from "@/lib/database.types"

// Types for your pass and tournament
interface PassType {
  id: string
  name: string
  passes_quantity: number
  points_value: number
}
interface AvailablePass {
  id: string
  quantity_remaining: number
  pass_type: PassType
}

export default function RedeemPassSection({ tournamentId }: { tournamentId: string }) {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  const [passes, setPasses] = useState<AvailablePass[]>([])
  const [selectedPassId, setSelectedPassId] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadPasses() {
      setLoading(true)
      setMessage(null)

      // 1) Ensure user logged in
      const {
        data: { session },
        error: sessError,
      } = await supabase.auth.getSession()
      if (sessError) {
        setMessage("Authentication error, please try again.")
        setLoading(false)
        return
      }
      if (!session) {
        router.push(`/login?from=/play/${tournamentId}/register`)
        return
      }

      // 2) Fetch tournament's required level
      const { data: tourn, error: tournErr } = await supabase
        .from("tournaments")
        .select("points_value")
        .eq("id", tournamentId)
        .single()
      if (tournErr || !tourn) {
        setMessage("Could not load tournament info.")
        setLoading(false)
        return
      }
      const requiredLevel = tourn.points_value

      // 3) Fetch non-depleted passes matching level
      const { data: listData, error: pErr } = await supabase
        .from("passes")
        .select(
          `id, quantity_remaining, pass_type:pass_types(
            id,
            name,
            passes_quantity,
            points_value
          )`
        )
        .gt("quantity_remaining", 0)
        .eq("pass_types.points_value", requiredLevel)

      if (pErr) {
        console.error("Error loading passes:", pErr)
        setPasses([])
      } else {
        const list = (listData ?? []).map((row) => {
          const pt = Array.isArray(row.pass_type)
            ? row.pass_type[0]
            : row.pass_type
          return {
            id: row.id,
            quantity_remaining: row.quantity_remaining,
            pass_type: pt!,
          }
        })
        setPasses(list)
        if (list.length) setSelectedPassId(list[0].id)
      }

      setLoading(false)
    }

    loadPasses()
  }, [tournamentId, router, supabase])

  const handleRedeem = async () => {
    if (!selectedPassId) return
    setLoading(true)
    setMessage(null)

    // 4) Call your SECURITY DEFINER RPC
    const { error: rpcErr } = await supabase.rpc("register_for_tournament", {
      p_tournament_id: tournamentId,
      p_pass_id: selectedPassId,
    })

    if (rpcErr) {
      setMessage(rpcErr.message)
      setLoading(false)
    } else {
      setMessage("✅ Registration successful!")
      router.push(`/play/${tournamentId}?registered=1`)
    }
  }

  if (loading) return <p>Loading passes…</p>
  if (!passes.length) return <p>You have no valid passes. Please purchase one.</p>

  return (
    <div className="space-y-4 max-w-sm">
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Select value={selectedPassId} onValueChange={setSelectedPassId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a pass…" />
        </SelectTrigger>
        <SelectContent>
          {passes.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.pass_type.name} — {p.quantity_remaining} left
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={handleRedeem} disabled={loading || !selectedPassId} className="w-full">
        {loading ? "Registering…" : "Complete Registration"}
      </Button>
    </div>
  )
}
