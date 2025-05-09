"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function BuyPassSection() {
  const [prices, setPrices] = useState<any[]>([])
  const [session, setSession] = useState<any>(null)

  // load pass types
  useEffect(() => {
    supabase
      .from("pass_types")
      .select("id, stripe_price_id, name, passes_quantity")
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setPrices(data ?? [])
      })

    // grab the current user session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  const handleCheckout = async (priceId: string) => {
    if (!session) {
      alert("Please sign in before purchasing.")
      return
    }
    const userId = session.user.id
    console.log("🚀 checkout for user:", userId, "price:", priceId)

    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId, userId }),
    })
    const { url, error } = await res.json()
    if (error) {
      console.error("API error:", error)
      alert(error)
      return
    }
    if (!url) {
      console.error("No URL returned")
      return
    }
    // redirect browser
    window.location.href = url
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Purchase Tournament Passes</CardTitle>
      </CardHeader>
      <CardContent>
        {prices.map((p) => (
          <div key={p.id} className="mb-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-600">
                Includes {p.passes_quantity} pass
                {p.passes_quantity > 1 ? "es" : ""}
              </p>
            </div>
            <Button onClick={() => handleCheckout(p.stripe_price_id)}>
              Purchase
            </Button>
          </div>
        ))}
        {prices.length === 0 && <p>Loading passes…</p>}
      </CardContent>
    </Card>
  )
}
