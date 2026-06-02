// POST /api/admin/orders/resync-customizations
// Re-reads order_items_json from the raw Stripe session metadata (stored in
// raw_stripe_session) and patches order_data.items[].customizations for any
// orders that have missing ball/grip color data.
//
// This fixes orders whose order_data_json was truncated at checkout time,
// causing the webhook to store empty customizations.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

type RawItem = {
  name?: string;
  qty?: number;
  ball_color?: string;
  grip_colors?: string[];
  crewneck_size?: string;
  [key: string]: unknown;
};

type OrderDataItem = {
  product_name?: string | null;
  slug?: string | null;
  quantity?: number | null;
  stripe_price_id?: string | null;
  unit_amount_cents?: number | null;
  currency?: string | null;
  amount_total_cents?: number | null;
  customizations?: Record<string, unknown>;
};

type OrderData = {
  version?: number;
  items?: OrderDataItem[];
  customer_selections?: Record<string, unknown>;
};

function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v === "string") {
    try { return JSON.parse(v.replace(/…$/, "")) as T; } catch { return fallback; }
  }
  return fallback;
}

export async function POST() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Fetch all orders that have a raw_stripe_session but may have missing customizations.
  // We look for orders where at least one item has empty customizations.
  const { data: orders, error: fetchError } = await supabaseAdmin
    .from("orders")
    .select("id, order_data, raw_stripe_session")
    .not("raw_stripe_session", "is", null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  let patched = 0;
  let skipped = 0;

  for (const order of (orders ?? [])) {
    const orderData = order.order_data as OrderData | null;
    const rawSession = order.raw_stripe_session as Record<string, unknown> | null;
    if (!orderData?.items || !rawSession) { skipped++; continue; }

    // Check if any item is missing customizations that should exist
    const hasMissingColors = orderData.items.some((item: OrderDataItem) => {
      const c = item.customizations ?? {};
      const needsBall = !c.ball_color;
      const needsGrip = !c.grip_colors;
      // Only flag if there are no customizations at all (not just partial)
      return Object.keys(c).length === 0 && needsBall && needsGrip;
    });

    if (!hasMissingColors) { skipped++; continue; }

    // Read order_items_json from the stored raw Stripe session metadata
    const meta =
      (rawSession?.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined
      ?? rawSession?.object as Record<string, unknown> | undefined
      ?? rawSession;

    const sessionMeta = (meta?.metadata ?? {}) as Record<string, unknown>;
    const rawItemsJson = sessionMeta.order_items_json as string | undefined;
    if (!rawItemsJson) { skipped++; continue; }

    const rawItems = parseJson<RawItem[]>(rawItemsJson, []);
    if (!rawItems.length) { skipped++; continue; }

    // Patch customizations by matching items positionally
    const patchedItems: OrderDataItem[] = orderData.items.map((item: OrderDataItem, i: number) => {
      const raw = rawItems[i];
      if (!raw) return item;

      const existingCustom = item.customizations ?? {};
      // Only patch if customizations are empty
      if (Object.keys(existingCustom).length > 0) return item;

      const newCustom: Record<string, unknown> = { ...existingCustom };
      if (raw.ball_color)   newCustom.ball_color  = raw.ball_color;
      if (raw.grip_colors?.length) {
        newCustom.grip_colors = raw.grip_colors;
      }
      if (raw.crewneck_size) newCustom.crewneck_size = raw.crewneck_size;

      return { ...item, customizations: newCustom };
    });

    const anyPatched = patchedItems.some((item: OrderDataItem, i: number) => {
      const before = JSON.stringify(orderData.items?.[i]?.customizations ?? {});
      const after  = JSON.stringify(item.customizations ?? {});
      return before !== after;
    });

    if (!anyPatched) { skipped++; continue; }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ order_data: { ...orderData, items: patchedItems } })
      .eq("id", order.id);

    if (updateError) {
      console.error(`Failed to patch order ${order.id}:`, updateError.message);
      skipped++;
    } else {
      patched++;
    }
  }

  return NextResponse.json({ patched, skipped, total: (orders ?? []).length });
}
