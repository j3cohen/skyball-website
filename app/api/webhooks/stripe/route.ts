// app/api/webhooks/stripe/route.ts
//
// Listens for `checkout.session.completed`. Signature verification and
// dispatch live here; the actual handler is in
// lib/server/stripeWebhookHandler.ts (extracted verbatim so the money
// path is testable — Next route files can't export extra functions).
//
// Configure in Stripe Dashboard → Webhooks → Add endpoint:
//   URL:    https://skyball.us/api/webhooks/stripe
//   Events: checkout.session.completed

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/server/stripe";
import { handleSessionCompleted } from "@/lib/server/stripeWebhookHandler";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing Stripe signature or webhook secret." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature verification failed.";
    console.error("⚠️ Stripe webhook signature error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    try {
      await handleSessionCompleted(event);
    } catch (err) {
      console.error("⚠️ Stripe webhook handler error:", err);
      return NextResponse.json({ error: "Internal processing error." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
