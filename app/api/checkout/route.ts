// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/server/stripe";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

type ProductKind = "base" | "addon" | "bundle";

type GripColor = "white" | "blue" | "orange" | "yellow" | "pink";

type CheckoutItemMeta = {
  gripColors?: GripColor[];
};

type CheckoutItem = {
  priceRowId: string; // public.product_prices.id
  qty: number;
  meta?: CheckoutItemMeta;
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isProductKind(v: unknown): v is ProductKind {
  return v === "base" || v === "addon" || v === "bundle";
}

function isGripColor(v: unknown): v is GripColor {
  return v === "white" || v === "blue" || v === "orange" || v === "yellow" || v === "pink";
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

function parseItemMeta(v: unknown): CheckoutItemMeta | undefined {
  if (!isRecord(v)) return undefined;

  const out: CheckoutItemMeta = {};

  if ("gripColors" in v && Array.isArray(v.gripColors)) {
    const colors: GripColor[] = [];
    for (const c of v.gripColors) {
      if (isGripColor(c)) colors.push(c);
    }
    if (colors.length > 0) out.gripColors = colors;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

function parseBody(v: unknown): CheckoutBody | null {
  if (!isRecord(v)) return null;
  if (!("items" in v) || !Array.isArray(v.items)) return null;

  const items: CheckoutItem[] = [];
  for (const it of v.items) {
    if (!isRecord(it)) return null;
    if (typeof it.priceRowId !== "string" || it.priceRowId.length === 0) return null;
    if (typeof it.qty !== "number" || !Number.isInteger(it.qty)) return null;

    const meta = "meta" in it ? parseItemMeta(it.meta) : undefined;

    items.push({ priceRowId: it.priceRowId, qty: it.qty, meta });
  }

  return { items };
}

// --- Add-on classifiers (based on your current slugs) ---
function isCoverSlug(slug: string): boolean {
  return slug === "skyball-racket-bag" || slug === "skyball-racket-bag-x2" || slug === "skyball-racket-bag-x4";
}

function isGripSlug(slug: string): boolean {
  return (
    slug === "professional-over-grip-skyball" ||
    slug === "professional-over-grips-skyball-2-pack" ||
    slug === "professional-over-grips-skyball-4-pack"
  );
}

type GripSlug =
  | "professional-over-grip-skyball"
  | "professional-over-grips-skyball-2-pack"
  | "professional-over-grips-skyball-4-pack";

function asGripSlug(slug: string): GripSlug | null {
  if (slug === "professional-over-grip-skyball") return slug;
  if (slug === "professional-over-grips-skyball-2-pack") return slug;
  if (slug === "professional-over-grips-skyball-4-pack") return slug;
  return null;
}

function gripPackSize(slug: GripSlug): number {
  if (slug === "professional-over-grip-skyball") return 1;
  if (slug === "professional-over-grips-skyball-2-pack") return 2;
  return 4;
}

function isRacketLikeProduct(slug: string, kind: ProductKind): boolean {
  // V1: any bundle counts as “has racket”
  if (kind === "bundle") return true;
  // base rackets contain "skyball-racket" in slug in your catalog
  if (kind === "base" && slug.includes("skyball-racket")) return true;
  return false;
}

type GripSelectionForStripe = {
  priceRowId: string;
  qty: number;
  packSize: number;
  selectedColors: GripColor[]; // can be empty
  unselectedCount: number; // packSize*qty - selectedColors.length (>=0)
};

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

    // 1) Fetch server-truth Stripe price IDs + product joins
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

    // 2) Relaxed add-on validation
    let hasBaseOrBundle = false;
    let hasRacketOrBundle = false;

    const addonProducts: ProductJoin[] = [];

    for (const item of body.items) {
      const prod = byId.get(item.priceRowId)?.product;
      if (!prod) continue;

      if (prod.kind === "base" || prod.kind === "bundle") hasBaseOrBundle = true;
      if (isRacketLikeProduct(prod.slug, prod.kind)) hasRacketOrBundle = true;
      if (prod.kind === "addon") addonProducts.push(prod);
    }

    if (addonProducts.length > 0 && !hasBaseOrBundle) {
      return NextResponse.json(
        {
          error:
            "Add-ons must be purchased with at least one base item or kit. Please add a product to your cart before adding add-ons. For custom orders or any questions, email info@skyball.us.",
        },
        { status: 400 }
      );
    }

    const invalidAddonSlugs: string[] = [];
    for (const addon of addonProducts) {
      if (isCoverSlug(addon.slug) && !hasRacketOrBundle) invalidAddonSlugs.push(addon.slug);
      // grips allowed with any base/bundle; since we already have hasBaseOrBundle if addons exist, this is basically ok
      if (isGripSlug(addon.slug) && !hasBaseOrBundle) invalidAddonSlugs.push(addon.slug);
    }

    if (invalidAddonSlugs.length > 0) {
      const hasCoverIssue = invalidAddonSlugs.some(isCoverSlug);
      const hasGripIssue = invalidAddonSlugs.some(isGripSlug);

      const parts: string[] = [];
      if (hasCoverIssue) {
        parts.push("Racket covers can only be purchased if your cart includes a racket or a kit that includes rackets.");
      }
      if (hasGripIssue) {
        parts.push("Overgrips can only be purchased with a base item or kit.");
      }
      parts.push("Please update your cart and try again.");
      parts.push("For custom orders or any questions, email info@skyball.us.");

      return NextResponse.json({ error: parts.join(" ") }, { status: 400 });
    }

    // 3) Optional grip metadata validation (NOT required to be complete)
    // If they pick some colors, we record them. If they pick none or not enough, remainder is "random".
    const gripSelections: GripSelectionForStripe[] = [];

    for (const item of body.items) {
      const prod = byId.get(item.priceRowId)?.product;
      if (!prod) continue;
      if (prod.kind !== "addon") continue;

      const gripSlug = asGripSlug(prod.slug);
      if (!gripSlug) continue;

      const packSize = gripPackSize(gripSlug);
      const expectedTotal = packSize * item.qty;

      const picked = item.meta?.gripColors ?? [];
      const selectedColors: GripColor[] = picked.filter(isGripColor);

      // If user provided MORE than expected, fail (that’s almost certainly a bug / tampering)
      if (selectedColors.length > expectedTotal) {
        return NextResponse.json(
          {
            error:
              `Too many grip colors were selected for your grips add-on. Please review your cart and try again. For custom orders or any questions, email info@skyball.us.`,
          },
          { status: 400 }
        );
      }

      const unselectedCount = expectedTotal - selectedColors.length;

      gripSelections.push({
        priceRowId: item.priceRowId,
        qty: item.qty,
        packSize,
        selectedColors,
        unselectedCount,
      });
    }

    // 4) Create Stripe Checkout Session line items
    const line_items = body.items.map((item) => {
      const row = byId.get(item.priceRowId);
      return { price: row!.stripe_price_id, quantity: item.qty };
    });

    // FIX: Stripe dropdown option "value" must be alphanumeric only.
    // Use values like: instagram, facebook, tiktok, google, youtube, friend, localclub, other
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US", "CA"],
      },
      phone_number_collection: { enabled: true },
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
              { label: "Local Racquet Club/Facility", value: "localclub" },
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
      // For fulfillment: visible in Stripe Dashboard (Session → Metadata)
      metadata: {
        grip_selections_json: JSON.stringify(gripSelections),
        grip_note: "If unselectedCount > 0, fill remaining grips with random colors.",
      },
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
