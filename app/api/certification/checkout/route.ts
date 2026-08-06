// app/api/certification/checkout/route.ts
// Stripe Checkout for certification offers (modeled on event-checkout).
// Price is ALWAYS re-derived server-side from cert_offers — the client
// only sends an offer id + quantity. Combo offers (equipment bundled)
// collect a US shipping address + phone; cert-only offers collect
// neither. Metadata carries only reference ids — the webhook loads
// everything else from the DB.

import { NextResponse } from "next/server";
import { stripe } from "@/lib/server/stripe";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { rateLimitResponse } from "@/lib/server/rateLimiter";
import { resolveOrigin } from "@/lib/server/requestOrigin";

export const dynamic = "force-dynamic";

type Body = { offerId?: string; qty?: number };

type OfferRow = {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  seat_count: number;
  equipment_items: { label: string; qty: number }[];
  active: boolean;
};

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "cert-checkout", 10);
  if (limited) return limited;
  try {
    const { offerId, qty: rawQty } = (await request.json()) as Body;
    if (!offerId || typeof offerId !== "string") {
      return NextResponse.json({ error: "Missing offerId." }, { status: 400 });
    }
    const qty =
      typeof rawQty === "number" && Number.isInteger(rawQty) && rawQty >= 1 && rawQty <= 20
        ? rawQty
        : 1;

    // Allowlisted — the success URL carries the Stripe session id, which
    // GET /api/certification/purchase trades for the seat claim tokens.
    const origin = resolveOrigin(request);
    if (!origin) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL." }, { status: 500 });
    }

    const { data: offer } = await supabaseAdmin
      .from("cert_offers")
      .select(
        "id, program_id, name, description, price_cents, currency, seat_count, equipment_items, active"
      )
      .eq("id", offerId)
      .single<OfferRow>();

    if (!offer || !offer.active) {
      return NextResponse.json({ error: "This offer is not available." }, { status: 404 });
    }

    const { data: program } = await supabaseAdmin
      .from("cert_programs")
      .select("id, title, status")
      .eq("id", offer.program_id)
      .single<{ id: string; title: string; status: string }>();

    if (!program || program.status !== "published") {
      return NextResponse.json(
        { error: "This certification is not open for purchase." },
        { status: 400 }
      );
    }

    const equipment = Array.isArray(offer.equipment_items) ? offer.equipment_items : [];
    const seatTotal = offer.seat_count * qty;

    const sharedMeta = {
      kind: "certification_purchase",
      program_id: program.id,
      offer_id: offer.id,
      qty: String(qty),
      order_summary: `${offer.name} — ${program.title} (${seatTotal} seat${
        seatTotal === 1 ? "" : "s"
      })`,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: offer.currency || "usd",
            unit_amount: offer.price_cents,
            product_data: {
              name: `${program.title} — ${offer.name}`,
              ...(offer.description ? { description: offer.description } : {}),
            },
          },
        },
      ],
      allow_promotion_codes: true,
      // Combo packs ship physical equipment: US-only address + phone,
      // exactly like the main shop checkout.
      ...(equipment.length > 0
        ? {
            shipping_address_collection: { allowed_countries: ["US"] },
            phone_number_collection: { enabled: true },
          }
        : {}),
      metadata: sharedMeta,
      payment_intent_data: { metadata: sharedMeta },
      success_url: `${origin}/coaching/purchased?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/coaching`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("⚠️ /api/certification/checkout error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
