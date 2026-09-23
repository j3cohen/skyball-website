// lib/server/stripeWebhookHandler.ts
// The checkout.session.completed handler, extracted VERBATIM from
// app/api/webhooks/stripe/route.ts so the money path is directly
// testable (route files can't export anything beyond route handlers).
// The route keeps signature verification + dispatch only.

import type Stripe from "stripe";
import { stripe } from "@/lib/server/stripe";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getMobileSupabase } from "@/lib/server/supabaseMobile";
import { fulfillCertificationPurchase } from "@/lib/server/certFulfill";

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

// ── Handler ────────────────────────────────────────────────────────────────

export async function handleSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata ?? {};
    // Sessions created by skyballglobal.com (shared live account until the cutover)
    // belong to the new site's webhook; never upsert an order for them here.
    if (meta.origin === "skyballglobal") return;

  // Certification purchases bypass the default orders upsert entirely:
  // cert-only packs write NO orders row (revenue lives in cert_purchases),
  // and combo packs write their own fulfillment order inside
  // fulfillCertificationPurchase(). Idempotent — the success page runs
  // the same fulfillment.
  if (meta.kind === "certification_purchase") {
    await fulfillCertificationPurchase(session);
    return;
  }

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
    fulfillment_status: /entry.?fee|open.?play|tournament.?entry|tournament.?pass/i.test(meta.order_summary ?? "")
      ? "event"
      : "pending",
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

  // Event/tournament payments also create a registration in the mobile project.
  if (meta.kind === "event_registration" && meta.tournament_id) {
    await recordEventRegistration(session, meta);
  }
}

// ── Mobile-project registration (paid events) ────────────────────────────────

async function recordEventRegistration(
  session: Stripe.Checkout.Session,
  meta: Record<string, string>
) {
  const tournamentId = meta.tournament_id;
  const profileId = meta.profile_id && meta.profile_id.length > 0 ? meta.profile_id : null;
  const email = session.customer_details?.email ?? null;
  const name = session.customer_details?.name ?? null;
  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? session.id;

  const mobile = getMobileSupabase();

  // Idempotency: the webhook can fire more than once — don't double-register.
  const { data: existing } = await mobile
    .from("tournament_entries")
    .select("id")
    .eq("stripe_payment_id", paymentId)
    .maybeSingle();

  if (existing) {
    console.log(`↺ Event registration already recorded for ${paymentId}`);
    return;
  }

  const paid = {
    payment_method: "stripe",
    payment_status: "paid",
    stripe_payment_id: paymentId,
    cancelled_at: null,
  };

  // Signed-in: revive a prior (possibly cancelled) entry — a unique constraint
  // on (tournament_id, profile_id) blocks a second row even after cancelling.
  if (profileId) {
    const { data: prior } = await mobile
      .from("tournament_entries")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (prior) {
      const { error } = await mobile
        .from("tournament_entries")
        .update({ ...paid, registered_at: new Date().toISOString() })
        .eq("id", (prior as { id: string }).id);
      if (error) throw new Error(`Mobile tournament_entries revive failed: ${error.message}`);
      console.log(`✅ Mobile registration revived: tournament ${tournamentId}`);
      return;
    }

    const { error } = await mobile
      .from("tournament_entries")
      .insert({ tournament_id: tournamentId, profile_id: profileId, ...paid });
    if (error) throw new Error(`Mobile tournament_entries insert failed: ${error.message}`);
    console.log(`✅ Mobile registration recorded: tournament ${tournamentId}`);
    return;
  }

  // Guest payer
  const { error } = await mobile
    .from("tournament_entries")
    .insert({ tournament_id: tournamentId, guest_email: email, guest_name: name, ...paid });
  if (error) {
    // Throw so Stripe retries — the order upsert and this insert are both
    // idempotent, so a retry won't duplicate revenue or registration.
    throw new Error(`Mobile tournament_entries insert failed: ${error.message}`);
  }
  console.log(`✅ Mobile registration recorded: tournament ${tournamentId}`);
}
