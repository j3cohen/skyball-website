// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/server/stripe";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";

type ProductKind = "base" | "addon" | "bundle";

type GripColor = "white" | "blue" | "orange" | "yellow" | "pink" | "random";
type BallColor = "blue" | "orange";
type CrewneckSize = "xs" | "s" | "m" | "l" | "xl" | "xxl";

type CheckoutItemMeta = {
  gripColors?: GripColor[];
  ballColors?: BallColor[];
  crewneckSize?: CrewneckSize;
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
  name: string;
  kind: ProductKind;
  active: boolean;
};

type PriceRowJoinRaw = {
  id: string;
  stripe_price_id: string;
  unit_amount: number;
  currency: string;
  active: boolean;
  product: ProductJoin | ProductJoin[] | null;
};

type PriceRowJoin = {
  id: string;
  stripe_price_id: string;
  unit_amount: number;
  currency: string;
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
  return v === "white" || v === "blue" || v === "orange" || v === "yellow" || v === "pink" || v === "random";
}

function isBallColor(v: unknown): v is BallColor {
  return v === "blue" || v === "orange";
}

function isCrewneckSize(v: unknown): v is CrewneckSize {
  return v === "xs" || v === "s" || v === "m" || v === "l" || v === "xl" || v === "xxl";
}

function isCrewneckSlug(slug: string): boolean {
  return slug === "skyball-crewneck-1";
}

function isProductJoin(v: unknown): v is ProductJoin {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.slug === "string" &&
    typeof v.name === "string" &&
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
    typeof v.unit_amount === "number" &&
    typeof v.currency === "string" &&
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

  if ("ballColors" in v && Array.isArray(v.ballColors)) {
    const colors: BallColor[] = [];
    for (const c of v.ballColors) {
      if (isBallColor(c)) colors.push(c);
    }
    if (colors.length > 0) out.ballColors = colors;
  }

  if ("crewneckSize" in v && isCrewneckSize(v.crewneckSize)) {
    out.crewneckSize = v.crewneckSize;
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

/** Products that require a ball color selection: base or bundle, not a crewneck. */
function requiresBallColor(slug: string, kind: ProductKind): boolean {
  if (kind !== "base" && kind !== "bundle") return false;
  if (slug.toLowerCase().includes("crewneck")) return false;
  if (slug.toLowerCase().includes("racket")) return false;
  return true;
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
  if (kind === "bundle") return true;
  if (kind === "base" && slug.includes("skyball-racket")) return true;
  return false;
}

type GripSelectionForStripe = {
  priceRowId: string;
  qty: number;
  packSize: number;
  selectedColors: GripColor[];
  unselectedCount: number;
};

type BallSelectionForStripe = {
  priceRowId: string;
  slug: string;
  qty: number;
  // One color per cart line item (not per ball in the pack)
  color: BallColor;
};

type CrewneckSelectionForStripe = {
  priceRowId: string;
  qty: number;
  size: CrewneckSize;
};

function formatGripFulfillment(grips: GripSelectionForStripe[]): string {
  if (grips.length === 0) return "No grip add-ons.";
  return grips
    .map((g) => {
      const colors = g.selectedColors.length ? g.selectedColors.join(", ") : "all random";
      return `Overgrips (${g.packSize * g.qty} total): ${colors}`;
    })
    .join(" | ");
}

function formatBallFulfillment(balls: BallSelectionForStripe[]): string {
  if (balls.length === 0) return "No ball color selections.";
  return balls
    .map((b) => `${b.slug} (qty ${b.qty}): ${b.color}`)
    .join(" | ");
}

function formatCrewneckFulfillment(crewnecks: CrewneckSelectionForStripe[]): string {
  if (crewnecks.length === 0) return "No crewneck orders.";
  return crewnecks
    .map((c) => `Crewneck (qty ${c.qty}): size ${c.size.toUpperCase()}`)
    .join(" | ");
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

    // 1) Fetch server-truth Stripe price IDs + product joins
    const priceRowIds = body.items.map((i) => i.priceRowId);

    const { data, error } = await supabaseAdmin
      .from("product_prices")
      .select(
        `
          id,
          stripe_price_id,
          unit_amount,
          currency,
          active,
          product:products (
            id,
            slug,
            name,
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
        unit_amount: r.unit_amount,
        currency: r.currency,
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

    // 3) Optional grip metadata validation
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

      if (selectedColors.length > expectedTotal) {
        return NextResponse.json(
          {
            error:
              "Too many grip colors were selected for your grips add-on. Please review your cart and try again. For custom orders or any questions, email info@skyball.us.",
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

    // 4) Ball color validation
    // One color per cart line item (regardless of how many balls are in the pack).
    const ballSelections: BallSelectionForStripe[] = [];

    for (const item of body.items) {
      const prod = byId.get(item.priceRowId)?.product;
      if (!prod) continue;
      if (!requiresBallColor(prod.slug, prod.kind)) continue;

      const picked = item.meta?.ballColors ?? [];
      const validColors = picked.filter(isBallColor);

      // Exactly one color must be provided per line item
      if (validColors.length !== 1) {
        return NextResponse.json(
          {
            error:
              "Please select a ball color (Blue or Orange) for each SkyBall product in your cart.",
          },
          { status: 400 }
        );
      }

      ballSelections.push({
        priceRowId: item.priceRowId,
        slug: prod.slug,
        qty: item.qty,
        color: validColors[0],
      });
    }

    // 5) Crewneck size validation
    const crewneckSelections: CrewneckSelectionForStripe[] = [];

    for (const item of body.items) {
      const prod = byId.get(item.priceRowId)?.product;
      if (!prod) continue;
      if (!isCrewneckSlug(prod.slug)) continue;

      if (!item.meta?.crewneckSize || !isCrewneckSize(item.meta.crewneckSize)) {
        return NextResponse.json(
          { error: "Please select a size for the SkyBall crewneck in your cart." },
          { status: 400 }
        );
      }

      crewneckSelections.push({
        priceRowId: item.priceRowId,
        qty: item.qty,
        size: item.meta.crewneckSize,
      });
    }

    // 6) Create Stripe Checkout Session line items
    const line_items = body.items.map((item) => {
      const row = byId.get(item.priceRowId);
      return { price: row!.stripe_price_id, quantity: item.qty };
    });

    const gripFulfillment = formatGripFulfillment(gripSelections);
    const ballFulfillment = formatBallFulfillment(ballSelections);
    const crewneckFulfillment = formatCrewneckFulfillment(crewneckSelections);

    // Compact per-item payload written to Stripe metadata and later picked up
    // by the webhook to populate the `order_data` column in Supabase.
    // Shape is intentionally open-ended: new product customizations go into
    // the same per-item object without any schema change.
    const orderDataJsonRaw = JSON.stringify(
      body.items.map((item) => {
        const row = byId.get(item.priceRowId)!;
        const prod = row.product!;
        const entry: Record<string, unknown> = {
          id: item.priceRowId,      // Supabase product_prices.id
          pid: row.stripe_price_id, // Stripe price ID
          slug: prod.slug,
          kind: prod.kind,
          qty: item.qty,
          cents: row.unit_amount,
        };
        const ballSel = ballSelections.find((b) => b.priceRowId === item.priceRowId);
        if (ballSel) entry.color = ballSel.color;
        const gripSel = gripSelections.find((g) => g.priceRowId === item.priceRowId);
        if (gripSel) {
          entry.colors = gripSel.selectedColors.length > 0 ? gripSel.selectedColors : ["random"];
          entry.unselected = gripSel.unselectedCount;
        }
        const crewneckSel = crewneckSelections.find((c) => c.priceRowId === item.priceRowId);
        if (crewneckSel) entry.size = crewneckSel.size;
        return entry;
      })
    );
    const orderDataJson = orderDataJsonRaw.length > 499
      ? orderDataJsonRaw.slice(0, 496) + "…"
      : orderDataJsonRaw;

    // 7) Build order summary metadata
    function fmtMoney(cents: number, cur: string): string {
      return "$" + (cents / 100).toFixed(2) + " " + cur.toUpperCase();
    }

    const orderItems = body.items.map((item) => {
      const row = byId.get(item.priceRowId)!;
      const prod = row.product!;
      const entry: Record<string, unknown> = {
        name: prod.name,
        qty: item.qty,
        unit: fmtMoney(row.unit_amount, row.currency),
        subtotal: fmtMoney(row.unit_amount * item.qty, row.currency),
      };
      const ballSel = ballSelections.find((b) => b.priceRowId === item.priceRowId);
      if (ballSel) entry.ball_color = ballSel.color;
      const gripSel = gripSelections.find((g) => g.priceRowId === item.priceRowId);
      if (gripSel) entry.grip_colors = gripSel.selectedColors.length > 0 ? gripSel.selectedColors : ["random"];
      const crewneckSel = crewneckSelections.find((c) => c.priceRowId === item.priceRowId);
      if (crewneckSel) entry.crewneck_size = crewneckSel.size.toUpperCase();
      return entry;
    });

    const totalCents = body.items.reduce((sum, item) => {
      return sum + byId.get(item.priceRowId)!.unit_amount * item.qty;
    }, 0);
    const firstCurrency = byId.get(body.items[0].priceRowId)?.currency ?? "usd";
    const orderTotal = fmtMoney(totalCents, firstCurrency);

    const summaryParts = orderItems.map((it) => {
      let s = `${it.qty}x ${it.name} (${it.subtotal})`;
      if (it.ball_color) s += ` [ball:${it.ball_color}]`;
      if (it.grip_colors) s += ` [grips:${(it.grip_colors as string[]).join(",")}]`;
      if (it.crewneck_size) s += ` [size:${it.crewneck_size}]`;
      return s;
    });
    const orderSummaryRaw = summaryParts.join(" | ") + ` | Total: ${orderTotal}`;
    const orderSummary = orderSummaryRaw.length > 499 ? orderSummaryRaw.slice(0, 496) + "…" : orderSummaryRaw;

    const orderItemsJsonRaw = JSON.stringify(orderItems);
    const orderItemsJson = orderItemsJsonRaw.length > 499 ? orderItemsJsonRaw.slice(0, 496) + "…" : orderItemsJsonRaw;

    const crewneckSelectionsJsonRaw = JSON.stringify(crewneckSelections);
    const crewneckSelectionsJson = crewneckSelectionsJsonRaw.length > 499
      ? crewneckSelectionsJsonRaw.slice(0, 496) + "…"
      : crewneckSelectionsJsonRaw;

    const sessionMeta = {
      grip_fulfillment: gripFulfillment,
      grip_selections_json: JSON.stringify(gripSelections),
      ball_fulfillment: ballFulfillment,
      ball_selections_json: JSON.stringify(ballSelections),
      crewneck_fulfillment: crewneckFulfillment,
      crewneck_selections_json: crewneckSelectionsJson,
      order_summary: orderSummary,
      order_total: orderTotal,
      order_items_json: orderItemsJson,
      // Adaptable per-item payload: consumed by the Stripe webhook to build
      // the `order_data` JSONB column in Supabase. New customization types
      // (future products) add keys here without any DB schema change.
      order_data_json: orderDataJson,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: totalCents >= 8999 ? ["US", "CA"] : ["US"],
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
      metadata: sessionMeta,
      payment_intent_data: {
        metadata: sessionMeta,
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