import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json()
    if (!userId) throw new Error("Missing userId")

    // create a Stripe Checkout session with metadata.user_id
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL!
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?success=1`,
      cancel_url:  `${origin}/dashboard?canceled=1`,
      metadata: { user_id: userId },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("⚠️ [create-checkout] error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
