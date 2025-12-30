// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/server/stripe";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

type ProductKind = "base" | "addon" | "bundle";

type CheckoutItem = {
  priceRowId: string; // public.product_prices.id
  qty: number;
};

type CheckoutBody = {
  items: CheckoutItem[];
};

type ProductJoin = {
  id: string;
  kind: ProductKind;
  active: boolean;
};

type PriceRowJoinRaw = {
  id: string;
  stripe_price_id: string;
  active: boolean;
  product: ProductJoin | ProductJoin[] | null;
};

type PriceRowJoin = {
  id: string;
  stripe_price_id: string;
  active: boolean;
  product: ProductJoin | null;
};

type AddonMappingRow = {
  base_product_id: string;
  addon_product_id: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isProductKind(v: unknown): v is ProductKind {
  return v === "base" || v === "addon" || v === "bundle";
}

function isProductJoin(v: unknown): v is ProductJoin {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    isProductKind(v.kind) &&
    typeof v.active === "boolean"
  );
}

function normalizeProduct(v: unknown): ProductJoin | null {
  if (isProductJoin(v)) return v;
  if (Array.isArray(v) && v.length > 0 && isProductJoin(v[0])) return v[0];
  return null;
}

function isPriceRowJoinRaw(v: unknown): v is PriceRowJoinRaw {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.stripe_price_id === "string" &&
    typeof v.active === "boolean" &&
    "product" in v
  );
}

function parseBody(v: unknown): CheckoutBody | null {
  if (!isRecord(v)) return null;
  if (!("items" in v) || !Array.isArray(v.items)) return null;

  const items: CheckoutItem[] = [];
  for (const it of v.items) {
    if (!isRecord(it)) return null;
    if (typeof it.priceRowId !== "string" || it.priceRowId.length === 0) return null;
    if (typeof it.qty !== "number" || !Number.isInteger(it.qty)) return null;
    items.push({ priceRowId: it.priceRowId, qty: it.qty });
  }

  return { items };
}

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const body = parseBody(json);

    if (!body || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    // Validate quantities
    for (const item of body.items) {
      if (item.qty < 1 || item.qty > 20) {
        return NextResponse.json({ error: "Invalid cart item quantity." }, { status: 400 });
      }
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;
    if (!origin) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL." }, { status: 500 });
    }

    // 1) Fetch server-truth Stripe price IDs + product kinds
    const priceRowIds = body.items.map((i) => i.priceRowId);

    const { data, error } = await supabaseAdmin
      .from("product_prices")
      .select(
        `
          id,
          stripe_price_id,
          active,
          product:products (
            id,
            kind,
            active
          )
        `
      )
      .in("id", priceRowIds);

    if (error) {
      console.error("Supabase error fetching prices:", error);
      return NextResponse.json({ error: "Failed to fetch pricing data." }, { status: 500 });
    }

    // Normalize rows (Supabase may return product as object OR array)
    const raw: unknown = data ?? [];
    const arr: unknown[] = Array.isArray(raw) ? raw : [];

    const rows: PriceRowJoin[] = arr
      .filter(isPriceRowJoinRaw)
      .map((r) => ({
        id: r.id,
        stripe_price_id: r.stripe_price_id,
        active: r.active,
        product: normalizeProduct(r.product),
      }));

    const byId = new Map<string, PriceRowJoin>(rows.map((r) => [r.id, r]));

    // Validate availability + presence
    for (const item of body.items) {
      const row = byId.get(item.priceRowId);
      if (!row || !row.active || !row.stripe_price_id || !row.product || !row.product.active) {
        return NextResponse.json({ error: "One or more items are unavailable." }, { status: 400 });
      }
    }

    // 2) Validate add-ons: add-ons must be allowed for at least one base/bundle in cart
    const baseProductIds = new Set<string>();
    const addonProductIds: string[] = [];

    for (const item of body.items) {
      const row = byId.get(item.priceRowId);
      const prod = row?.product;
      if (!prod) continue;

      if (prod.kind === "addon") addonProductIds.push(prod.id);
      if (prod.kind === "base" || prod.kind === "bundle") baseProductIds.add(prod.id);
    }

    if (addonProductIds.length > 0) {
      if (baseProductIds.size === 0) {
        return NextResponse.json({ error: "Add-ons require a base item." }, { status: 400 });
      }

      const { data: mappings, error: mapErr } = await supabaseAdmin
        .from("product_addons")
        .select("base_product_id, addon_product_id")
        .in("addon_product_id", addonProductIds)
        .in("base_product_id", Array.from(baseProductIds));

      if (mapErr) {
        console.error("Supabase error validating add-ons:", mapErr);
        return NextResponse.json({ error: "Failed to validate add-ons." }, { status: 500 });
      }

      const rawMap: unknown = mappings ?? [];
      const mapArr: unknown[] = Array.isArray(rawMap) ? rawMap : [];

      const mappingRows: AddonMappingRow[] = mapArr
        .filter((m): m is AddonMappingRow => {
          if (!isRecord(m)) return false;
          return typeof m.base_product_id === "string" && typeof m.addon_product_id === "string";
        });

      const allowedPairs = new Set<string>(
        mappingRows.map((m) => `${m.base_product_id}:${m.addon_product_id}`)
      );

      for (const addonId of addonProductIds) {
        let ok = false;
        for (const baseId of baseProductIds) {
          if (allowedPairs.has(`${baseId}:${addonId}`)) {
            ok = true;
            break;
          }
        }
        if (!ok) {
          return NextResponse.json({ error: "Invalid add-on selection." }, { status: 400 });
        }
      }
    }

    // 3) Create Stripe Checkout Session
    const line_items = body.items.map((item) => {
      const row = byId.get(item.priceRowId);
      // row is guaranteed by validation above
      return { price: row!.stripe_price_id, quantity: item.qty };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      allow_promotion_codes: true,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("⚠️ /api/checkout error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
