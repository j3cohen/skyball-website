// app/api/certification/purchase/route.ts
// GET ?session_id=cs_… — the success-page endpoint. Verifies payment
// with Stripe, runs the same idempotent fulfillment as the webhook
// (covers webhook lag), and returns the seat claim links.
// Auth model: knowledge of the Stripe session id IS the credential —
// it only exists in the buyer's redirect URL.

import { NextResponse } from "next/server";
import { stripe } from "@/lib/server/stripe";
import { fulfillCertificationPurchase } from "@/lib/server/certFulfill";
import { rateLimitResponse } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = rateLimitResponse(request, "cert-purchase", 30);
  if (limited) return limited;
  try {
    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if ((session.metadata ?? {}).kind !== "certification_purchase") {
      return NextResponse.json({ error: "Not a certification purchase." }, { status: 400 });
    }
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed." }, { status: 402 });
    }

    const result = await fulfillCertificationPurchase(session);
    if (!result) {
      return NextResponse.json({ error: "Could not load purchase." }, { status: 500 });
    }

    return NextResponse.json({
      programTitle: result.programTitle,
      offerName: result.offerName,
      purchaserEmail: session.customer_details?.email ?? null,
      seats: result.seats.map((s) => ({ claimToken: s.claim_token, status: s.status })),
    });
  } catch (err: unknown) {
    console.error("⚠️ /api/certification/purchase error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
