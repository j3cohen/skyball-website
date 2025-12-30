import { NextResponse } from "next/server";
import { stripe } from "@/lib/server/stripe";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

type CheckoutItem = {
  priceRowId: string; // public.product_prices.id
  qty: number;
};

type Body = {
  items: CheckoutItem[];
};

export async function POST(request: Request) {
  try {
    const { items } = (await request.json()) as Body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty." },
        { status: 400 }
      );
    }

    // Basic input validation
    for (const item of items) {
      if (
        !item.priceRowId ||
        !Number.isInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > 20
      ) {
        return NextResponse.json(
          { error: "Invalid cart item." },
          { status: 400 }
        );
      }
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL;

    if (!origin) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL." },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------
    // 1) Fetch server-truth price + product info from Supabase
    // ------------------------------------------------------------
    const priceRowIds = items.map((i) => i.priceRowId);

    const { data, error } = await supabaseAdmin
      .from("product_prices")
      .select(`
        id,
        stripe_price_id,
        active,
        product:products (
          id,
          kind,
          active
        )
      `)
      .in("id", priceRowIds);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch pricing data." },
        { status: 500 }
      );
    }

    const rows = data ?? [];
    const byId = new Map(rows.map((r: any) => [r.id, r]));

    // Validate all requested items
    for (const item of items) {
      const row = byId.get(item.priceRowId);

      if (
        !row ||
        !row.active ||
        !row.stripe_price_id ||
        !row.product ||
        !row.product.active
      ) {
        return NextResponse.json(
          { error: "One or more items are unavailable." },
          { status: 400 }
        );
      }
    }

    // ------------------------------------------------------------
    // 2) (Future-proof) Enforce add-on rules
    // ------------------------------------------------------------
    const baseProductIds = new Set<string>();
    const addonProductIds: string[] = [];

    for (const item of items) {
      const row = byId.get(item.priceRowId);
      const kind = row.product.kind;

      if (kind === "addon") addonProductIds.push(row.product.id);
      if (kind === "base" || kind === "bundle") {
        baseProductIds.add(row.product.id);
      }
    }

    if (addonProductIds.length > 0) {
      if (baseProductIds.size === 0) {
        return NextResponse.json(
          { error: "Add-ons require a base item." },
          { status: 400 }
        );
      }

      const { data: mappings, error: mapErr } = await supabaseAdmin
        .from("product_addons")
        .select("base_product_id, addon_product_id")
        .in("addon_product_id", addonProductIds)
        .in("base_product_id", Array.from(baseProductIds));

      if (mapErr) {
        console.error("Addon validation error:", mapErr);
        return NextResponse.json(
          { error: "Failed to validate add-ons." },
          { status: 500 }
        );
      }

      const allowed = new Set(
        (mappings ?? []).map(
          (m) => `${m.base_product_id}:${m.addon_product_id}`
        )
      );

      for (const addonId of addonProductIds) {
        let valid = false;
        for (const baseId of baseProductIds) {
          if (allowed.has(`${baseId}:${addonId}`)) {
            valid = true;
            break;
          }
        }
        if (!valid) {
          return NextResponse.json(
            { error: "Invalid add-on selection." },
            { status: 400 }
          );
        }
      }
    }

    // ------------------------------------------------------------
    // 3) Create Stripe Checkout Session
    // ------------------------------------------------------------
    const line_items = items.map((item) => {
      const row = byId.get(item.priceRowId);
      return {
        price: row.stripe_price_id,
        quantity: item.qty,
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      allow_promotion_codes: true,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("⚠️ /api/checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
