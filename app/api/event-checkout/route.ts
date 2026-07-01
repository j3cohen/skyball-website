// app/api/event-checkout/route.ts
// Site-generated Stripe Checkout for paid tournament/event registration.
// The session carries the tournament_id (and profile_id when the buyer is
// signed in) in metadata, so the Stripe webhook can dual-write:
//   - revenue  -> website `orders` (tagged "event")
//   - registration -> mobile `tournament_entries`
import { NextResponse } from "next/server";
import { stripe } from "@/lib/server/stripe";
import { getMobileSupabase } from "@/lib/server/supabaseMobile";

export const dynamic = "force-dynamic";

type Body = { tournamentId?: string; profileId?: string | null };

type TournamentRow = {
  id: string;
  name: string;
  entry_fee: number | null;
  status: string;
};

export async function POST(request: Request) {
  try {
    const { tournamentId, profileId } = (await request.json()) as Body;
    if (!tournamentId) {
      return NextResponse.json({ error: "Missing tournamentId." }, { status: 400 });
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL." }, { status: 500 });
    }

    // Server-truth tournament data from the mobile project (never trust the fee
    // from the client).
    const { data: tournament, error } = await getMobileSupabase()
      .from("tournaments")
      .select("id, name, entry_fee, status")
      .eq("id", tournamentId)
      .single<TournamentRow>();

    if (error || !tournament) {
      return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
    }
    if (tournament.status === "completed" || tournament.status === "draft") {
      return NextResponse.json({ error: "Registration is not open for this event." }, { status: 400 });
    }

    const fee = tournament.entry_fee ?? 0;
    if (fee <= 0) {
      return NextResponse.json({ error: "This event is free — no payment needed." }, { status: 400 });
    }

    // order_summary intentionally contains "Tournament entry" so the webhook's
    // event-detection regex tags the website order as "event".
    const sharedMeta = {
      kind: "event_registration",
      tournament_id: tournament.id,
      tournament_name: tournament.name,
      profile_id: profileId ?? "",
      order_summary: `Tournament entry: ${tournament.name} ($${fee})`,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(fee * 100),
            product_data: { name: `${tournament.name} — Tournament Entry` },
          },
        },
      ],
      allow_promotion_codes: true,
      metadata: sharedMeta,
      payment_intent_data: { metadata: sharedMeta },
      success_url: `${origin}/play/${tournament.id}?registered=1`,
      cancel_url: `${origin}/play/${tournament.id}/register`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("⚠️ /api/event-checkout error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
