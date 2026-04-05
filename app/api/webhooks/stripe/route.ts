// app/api/webhooks/stripe/route.ts
//
// Listens for `checkout.session.completed` and writes one row to the
// Supabase `orders` table.  The row uses the versioned `order_data`
// JSONB column so new product types never require a schema migration —
// just add new keys inside each item's `customizations` object.
//
// Configure in Stripe Dashboard → Webhooks → Add endpoint:
//   URL:    https://skyball.us/api/webhooks/stripe
//   Events: checkout.session.completed

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/server/stripe";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

export const dynamic = "force-dynamic";

// ── Types ──────────────────────────────────────────────────────────────────

type OrderDataItem = {
  stripe_price_id: string | null | undefined;
  product_name: string | null | undefined;
  slug: string | null | undefined;
  quantity: number | null;
  unit_amount_cents: number | null | undefined;
  currency: string | null | undefined;
  amount_total_cents: number | null;
  // Open-ended customizations — any future product keys land here without
  // changing the DB schema.
  customizations: Record<string, unknown>;
};

type RawDataItem = {
  id?: string;
  pid?: string;
  slug?: string;
  kind?: string;
  qty?: number;
  cents?: number;
  color?: string;
  colors?: string[];
  unselected?: number;
  size?: string;
  [key: string]: unknown;
};

// ── Helper: parse JSON safely ──────────────────────────────────────────────

function tryParseJson<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw.replace(/…$/, "")) as T;
  } catch {
    return fallback;
  }
}

// ── POST ───────────────────────────────────────────────────────────────────

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

// ── Handler ────────────────────────────────────────────────────────────────

async function handleSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};

  // Expand line items so we get product names + price details
  const expanded = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product"],
  });
  const lineItems = expanded.line_items?.data ?? [];

  // Parse the compact per-item payload written by the checkout route.
  // Keys: id, pid (stripe_price_id), slug, kind, qty, cents,
  //       color?, colors?, unselected?, size?, ...future
  const rawItems = tryParseJson<RawDataItem[]>(meta.order_data_json, []);
  const rawByPid = new Map<string, RawDataItem>(
    rawItems.map((r) => [r.pid ?? "", r])
  );

  // Build the versioned order_data payload
  const items: OrderDataItem[] = lineItems.map((li) => {
    const price = li.price as Stripe.Price | null;
    const product = price?.product as Stripe.Product | null;
    const raw = rawByPid.get(price?.id ?? "") ?? {};

    const customizations: Record<string, unknown> = {};

    // Ball color
    if (raw.color) customizations.ball_color = raw.color;

    // Grip colors
    if (raw.colors) {
      customizations.grip_colors = raw.colors;
      if (raw.unselected != null) customizations.unselected_grips = raw.unselected;
    }

    // Crewneck size
    if (raw.size) customizations.crewneck_size = raw.size;

    // Preserve any other future keys from raw that aren't the core fields
    const coreKeys = new Set(["id", "pid", "slug", "kind", "qty", "cents", "color", "colors", "unselected", "size"]);
    for (const [k, v] of Object.entries(raw)) {
      if (!coreKeys.has(k)) customizations[k] = v;
    }

    return {
      stripe_price_id: price?.id,
      product_name: product?.name ?? price?.nickname ?? raw.slug,
      slug: raw.slug ?? null,
      quantity: li.quantity,
      unit_amount_cents: price?.unit_amount,
      currency: price?.currency,
      amount_total_cents: li.amount_total,
      customizations,
    };
  });

  // Pull custom field responses
  const heardAboutUs =
    session.custom_fields?.find((f) => f.key === "heard_about_us")?.dropdown?.value ?? null;
  const orderNotes =
    session.custom_fields?.find((f) => f.key === "order_notes")?.text?.value ?? null;

  const orderData = {
    version: 1,
    items,
    customer_selections: {
      heard_about_us: heardAboutUs,
      order_notes: orderNotes,
    },
  };

  // Shipping address
  const addr = expanded.collected_information?.shipping_details?.address ?? null;
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
    order_data: orderData,
    order_total_cents: session.amount_total,
    order_currency: session.currency ?? "usd",
    order_summary: meta.order_summary ?? null,
    fulfillment_status: "pending",
    heard_about_us: heardAboutUs,
    customer_order_notes: orderNotes,
    raw_stripe_session: event as unknown as Record<string, unknown>,
  };

  const { error } = await supabaseAdmin
    .from("orders")
    .upsert(record, { onConflict: "stripe_session_id" });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  console.log(`✅ Order stored: ${session.id}`);
}
