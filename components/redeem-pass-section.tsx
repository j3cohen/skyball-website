// components/redeem-pass-section.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

type PassType = {
  id: string
  name: string
  passes_quantity: number
  points_value: number
}

type AvailablePass = {
  id: string
  quantity_remaining: number
  pass_type: PassType
}

export default function RedeemPassSection({ tournamentId }: { tournamentId: string }) {
  const [passes, setPasses] = useState<AvailablePass[]>([])
  const [selectedPassId, setSelectedPassId] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadPasses() {
      setLoading(true)
      // 1) ensure user logged in
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push(`/login?from=/play/${tournamentId}/register`)
        return
      }

      // 2) fetch all non-depleted passes and their types
      const { data, error } = await supabase
        .from("passes")
        .select(`
          id,
          quantity_remaining,
          pass_type: pass_types (
            id,
            name,
            passes_quantity,
            points_value
          )
        `)
        .gt("quantity_remaining", 0)

      if (error) {
        console.error("Error loading passes:", error)
        setPasses([])
      } else {
        const list = (data ?? []).map((row) => {
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
  }, [tournamentId, router])

  const handleRedeem = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.rpc("register_for_tournament", {
      p_tournament_id: tournamentId,
      p_pass_id: selectedPassId,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    } else {
      setMessage("✅ Registration successful!")
      // refresh listings / navigate back
      router.push(`/play/${tournamentId}?registered=1`)
    }
  }

  if (loading) return <p>Loading passes…</p>
  if (!passes.length) return <p>You have no passes to redeem.</p>

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

      <Button
        onClick={handleRedeem}
        disabled={loading || !selectedPassId}
        className="w-full"
      >
        {loading ? "Registering…" : "Complete Registration"}
      </Button>
    </div>
  )
}
