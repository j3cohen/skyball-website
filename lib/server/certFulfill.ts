// lib/server/certFulfill.ts
// Shared fulfillment for certification purchases. Called from BOTH the
// Stripe webhook and the success-page route (GET /api/certification/
// purchase) so a webhook delay never strands a buyer — whichever runs
// first creates the rows, the other finds them.
//
// Idempotency: query-then-insert on cert_purchases keyed by the UNIQUE
// stripe_session_id; a 23505 race loser re-queries. Seats are inserted
// only by the caller that won the purchase insert.
//
// Combo offers (equipment_items non-empty) additionally upsert ONE
// orders row at the full pack price with fulfillment_status "pending",
// so the physical goods enter the normal fulfillment queue and revenue
// dashboards. Cert-only purchases write NO orders row (owner decision).

import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { generateClaimToken } from "@/lib/server/certCodes";

type EquipmentItem = { label: string; qty: number };

type OfferRow = {
  id: string;
  program_id: string;
  name: string;
  price_cents: number;
  currency: string;
  seat_count: number;
  equipment_items: EquipmentItem[];
};

export type FulfilledPurchase = {
  purchaseId: string;
  programId: string;
  programTitle: string;
  offerName: string;
  seats: { id: string; claim_token: string; status: string }[];
};

export async function fulfillCertificationPurchase(
  session: Stripe.Checkout.Session
): Promise<FulfilledPurchase | null> {
  const meta = session.metadata ?? {};
  const offerId = meta.offer_id;
  const qty = Math.max(1, Number.parseInt(meta.qty ?? "1", 10) || 1);
  if (!offerId) {
    console.error("certFulfill: session missing offer_id metadata", session.id);
    return null;
  }

  const { data: offer } = await supabaseAdmin
    .from("cert_offers")
    .select("id, program_id, name, price_cents, currency, seat_count, equipment_items")
    .eq("id", offerId)
    .single<OfferRow>();
  if (!offer) {
    console.error("certFulfill: unknown offer", offerId);
    return null;
  }

  const { data: program } = await supabaseAdmin
    .from("cert_programs")
    .select("id, title")
    .eq("id", offer.program_id)
    .single<{ id: string; title: string }>();

  const seatTotal = offer.seat_count * qty;

  // ── Idempotent purchase row ─────────────────────────────────────
  const existing = await supabaseAdmin
    .from("cert_purchases")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  let purchaseId: string;
  let createdHere = false;

  if (existing.data) {
    purchaseId = (existing.data as { id: string }).id;
  } else {
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

    const insert = await supabaseAdmin
      .from("cert_purchases")
      .insert({
        program_id: offer.program_id,
        offer_id: offer.id,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        purchaser_email: session.customer_details?.email ?? null,
        purchaser_name: session.customer_details?.name ?? null,
        seat_count: seatTotal,
        amount_total_cents: session.amount_total,
        currency: session.currency ?? "usd",
      })
      .select("id")
      .single<{ id: string }>();

    if (insert.error) {
      // 23505 = the webhook/success-page race — the other caller won.
      if (insert.error.code === "23505") {
        const requery = await supabaseAdmin
          .from("cert_purchases")
          .select("id")
          .eq("stripe_session_id", session.id)
          .single<{ id: string }>();
        if (!requery.data) throw new Error("cert purchase race re-query failed");
        purchaseId = requery.data.id;
      } else {
        throw new Error(`cert_purchases insert failed: ${insert.error.message}`);
      }
    } else {
      purchaseId = insert.data.id;
      createdHere = true;
    }
  }

  // ── Seats (winner only) ─────────────────────────────────────────
  if (createdHere) {
    const seatRows = Array.from({ length: seatTotal }, () => ({
      purchase_id: purchaseId,
      program_id: offer.program_id,
      claim_token: generateClaimToken(),
    }));
    const { error: seatErr } = await supabaseAdmin.from("cert_seats").insert(seatRows);
    if (seatErr) throw new Error(`cert_seats insert failed: ${seatErr.message}`);

    // Combo pack → one orders row for fulfillment + revenue dashboards.
    const equipment = Array.isArray(offer.equipment_items) ? offer.equipment_items : [];
    if (equipment.length > 0) {
      await upsertComboOrder(session, offer, program?.title ?? "Certification", qty, seatTotal);
    }

    await sendTelegramAlert(session, offer, program?.title ?? "Certification", seatTotal);
  }

  const { data: seats } = await supabaseAdmin
    .from("cert_seats")
    .select("id, claim_token, status")
    .eq("purchase_id", purchaseId)
    .order("created_at", { ascending: true });

  return {
    purchaseId,
    programId: offer.program_id,
    programTitle: program?.title ?? "Certification",
    offerName: offer.name,
    seats: (seats ?? []) as { id: string; claim_token: string; status: string }[],
  };
}

// ── Combo orders row ──────────────────────────────────────────────

async function upsertComboOrder(
  session: Stripe.Checkout.Session,
  offer: OfferRow,
  programTitle: string,
  qty: number,
  seatTotal: number
) {
  const equipment = offer.equipment_items.map((i) => ({ label: i.label, qty: i.qty * qty }));
  const summaryParts = [
    ...equipment.map((i) => `${i.qty}× ${i.label}`),
    `${seatTotal}× Certification seat`,
  ];

  const addr = session.collected_information?.shipping_details?.address ?? null;
  const shippingAddress = addr
    ? {
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        postal_code: addr.postal_code,
        country: addr.country,
      }
    : null;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  const record = {
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    customer_email: session.customer_details?.email ?? null,
    customer_name: session.customer_details?.name ?? null,
    customer_phone: session.customer_details?.phone ?? null,
    shipping_address: shippingAddress,
    order_data: {
      version: 1,
      items: equipment.map((i) => ({
        stripe_price_id: null,
        product_name: i.label,
        slug: null,
        quantity: i.qty,
        unit_amount_cents: null,
        currency: session.currency ?? "usd",
        amount_total_cents: null,
        customizations: {},
      })),
      customer_selections: {},
      certification: {
        program_title: programTitle,
        offer_name: offer.name,
        seat_count: seatTotal,
      },
    },
    order_total_cents: session.amount_total,
    order_currency: session.currency ?? "usd",
    order_summary: `${offer.name} (${programTitle}): ${summaryParts.join(", ")}`,
    fulfillment_status: "pending",
    raw_stripe_session: session as unknown as Record<string, unknown>,
  };

  const { error } = await supabaseAdmin
    .from("orders")
    .upsert(record, { onConflict: "stripe_session_id" });
  if (error) throw new Error(`combo orders upsert failed: ${error.message}`);
  console.log(`✅ Combo order stored: ${session.id}`);
}

// ── Telegram (best-effort, never blocks fulfillment) ──────────────

async function sendTelegramAlert(
  session: Stripe.Checkout.Session,
  offer: OfferRow,
  programTitle: string,
  seatTotal: number
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const amount = session.amount_total != null ? `$${(session.amount_total / 100).toFixed(2)}` : "";
  const buyer = session.customer_details?.name || session.customer_details?.email || "Unknown";
  const text =
    `🎓 *Certification purchase*\n` +
    `${offer.name} — ${programTitle}\n` +
    `Buyer: ${buyer}\n` +
    `Seats: ${seatTotal} ${amount ? `· ${amount}` : ""}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (err) {
    console.error("certFulfill telegram alert failed:", err);
  }
}
