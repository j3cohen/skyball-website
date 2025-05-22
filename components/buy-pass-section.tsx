// components/buy-pass-section.tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PassType = {
  id: string
  stripe_price_id: string
  name: string
  passes_quantity: number
  price: string
  points_value: number
}

export default function BuyPassSection() {
  const [passTypes, setPassTypes] = useState<PassType[]>([])
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null>(null);

  useEffect(() => {
    // load pass types (now including the `price` column)
    supabase
      .from("pass_types")
      .select("id, points_value, stripe_price_id, name, passes_quantity, price")
      .then(({ data, error }) => {
        if (error) console.error("Error loading pass types:", error)
        else setPassTypes(data ?? [])
      })

    // grab the current user session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  const handleCheckout = async (stripePriceId: string) => {
    if (!session) {
      alert("Please sign in before purchasing.")
      return
    }

    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: stripePriceId, userId: session.user.id }),
    })

    const { url, error } = await res.json()
    if (error) {
      console.error("API error:", error)
      alert(error)
      return
    }
    if (!url) {
      console.error("No URL returned from create-checkout")
      return
    }

    // redirect browser to Stripe Checkout
    window.location.href = url
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Purchase Tournament Passes</CardTitle>
      </CardHeader>
      <CardContent>
        {passTypes.length === 0 && <p>Loading passes…</p>}

        {passTypes.map((p) => (
          <div
            key={p.id}
            className="mb-4 flex justify-between items-center border-b pb-4 last:border-0 last:pb-0"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-600">
                {p.passes_quantity} pass{p.passes_quantity > 1 ? "es" : ""} for{" "}
                <span className="font-semibold">{p.price}</span>
              </p>
            </div>
            <Button onClick={() => handleCheckout(p.stripe_price_id)}>
              Purchase
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
