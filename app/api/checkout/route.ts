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
  slug: string;
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

// type AddonMappingRow = {
//   base_product_id: string;
//   addon_product_id: string;
// };

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
    typeof v.slug === "string" &&
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
            slug,
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

    // 2) Validate add-ons (relaxed rules)
    // - Covers allowed if cart contains ANY racket or bundle (bundle assumed includes rackets)
    // - Grips allowed if cart contains ANY base/bundle item at all
    // - Do NOT require exact base->addon mapping
    // - Do NOT block checkout for mismatch; just enforce the two global rules

    function isCoverSlug(slug: string): boolean {
      // (Your slugs are still "bag" even if display name is now "cover")
      return (
        slug === "skyball-racket-bag" ||
        slug === "skyball-racket-bag-x2" ||
        slug === "skyball-racket-bag-x4"
      );
    }

    function isGripSlug(slug: string): boolean {
      return (
        slug === "professional-over-grip-skyball" ||
        slug === "professional-over-grips-skyball-2-pack" ||
        slug === "professional-over-grips-skyball-4-pack"
      );
    }

    function isRacketLikeProduct(slug: string, kind: ProductKind): boolean {
      // V1: any bundle counts as "has racket"
      if (kind === "bundle") return true;
      // base rackets contain "racket" in slug in your catalog
      if (kind === "base" && slug.includes("skyball-racket")) return true;
      return false;
    }

    let hasBaseOrBundle = false;
    let hasRacketOrBundle = false;

    const addonProducts: ProductJoin[] = [];

    for (const item of body.items) {
      const row = byId.get(item.priceRowId);
      const prod = row?.product;
      if (!prod) continue;

      if (prod.kind === "base" || prod.kind === "bundle") {
        hasBaseOrBundle = true;
      }
      if (isRacketLikeProduct(prod.slug, prod.kind)) {
        hasRacketOrBundle = true;
      }
      if (prod.kind === "addon") {
        addonProducts.push(prod);
      }
    }

    // If there are add-ons but no base/bundle in cart, block checkout
    if (addonProducts.length > 0 && !hasBaseOrBundle) {
      return NextResponse.json(
        { 
          error: 
            'Add-ons must be purchased with at least one base item or kit. Please add a product to your cart before adding add-ons. For custom orders or any questions, email info@skyball.us.', 
        },
        { status: 400 }
      );
    }

    // Determine which add-ons violate the relaxed rules
    const invalidAddonSlugs: string[] = [];

    for (const addon of addonProducts) {
      if (isCoverSlug(addon.slug) && !hasRacketOrBundle) {
        invalidAddonSlugs.push(addon.slug);
      }
      if (isGripSlug(addon.slug) && !hasBaseOrBundle) {
        // This is basically unreachable because we already checked hasBaseOrBundle above,
        // but leaving it keeps logic complete and future-proof.
        invalidAddonSlugs.push(addon.slug);
      }
    }

    if (invalidAddonSlugs.length > 0) {
      // Craft a friendly, explicit error message
      const hasCoverIssue = invalidAddonSlugs.some((s) => isCoverSlug(s));
      const hasGripIssue = invalidAddonSlugs.some((s) => isGripSlug(s));

      const parts: string[] = [];

      if (hasCoverIssue) {
        parts.push(
          "Racket covers can only be purchased if your cart includes a racket or a kit that includes rackets."
        );
      }
      if (hasGripIssue) {
        parts.push("Overgrips can only be purchased with a base item or kit.");
      }

      parts.push("Please update your cart and try again.");
      parts.push("For custom orders or any questions, email info@skyball.us.");

      return NextResponse.json({ error: parts.join(" ") }, { status: 400 });
    }


    // 3) Create Stripe Checkout Session
    const line_items = body.items.map((item) => {
      const row = byId.get(item.priceRowId);
      return { price: row!.stripe_price_id, quantity: item.qty };
    });


    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      phone_number_collection: {
        enabled: true,
      },
      custom_fields: [
        {
          key: "heard_about_us",
          label: { type: "custom", custom: "How did you hear about us?" },
          type: "dropdown",
          dropdown: {
            options: [
              { label: "Instagram", value: "instagram" },
              { label: "Facebook", value: "facebook" },
              { label: "TikTok", value: "tiktok" },
              { label: "Google", value: "google" },
              { label: "YouTube", value: "youtube" },
              { label: "Friend", value: "friend" },
              { label: "Local Racquet Club or Facility", value: "local_club" },
              { label: "Other", value: "other" },
            ],
          },
        },
        {
          key: "order_notes",
          label: { type: "custom", custom: "Comments/notes for us to review?" },
          type: "text",
          optional: true,
          text: {},
        },
      ],
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
