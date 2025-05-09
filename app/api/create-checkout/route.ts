import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // You can omit apiVersion to use your dashboard’s default
  // apiVersion: "2025-04-30.basil",
})

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: "Must be signed in to purchase." },
        { status: 400 }
      )
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL!
    if (!origin) {
      throw new Error(
        "Missing origin header or NEXT_PUBLIC_APP_URL environment variable"
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?success=1`,
      cancel_url:  `${origin}/dashboard?canceled=1`,
      metadata: {
        user_id:  userId,
        price_id: priceId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("⚠️ [create-checkout] error:", err)
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
