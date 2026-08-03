// GET /api/admin/analytics/fulfillment
// Returns fulfillment speed, unfulfilled aging, shipping cost breakdowns.
//
// Every row carries `o` — indices into the top-level `orderIds` table naming the
// orders behind that number. The indices are collected inside the same loops
// that compute the aggregates, so a drill-down can never disagree with the
// figure it was opened from.
//
// Query params: from, to, region, focusDim, focusVal

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import {
  parseRegion, matchesRegion, matchesDateRange, parseDateParams,
  createOrderIndex, inferCarrier, AGE_BUCKETS, orderAgeDays,
  parseFocus, orderMatchesFocus,
  type AnalyticsOrder, type TrackingEntry,
} from "@/lib/analytics-utils";
import type { ShippingAddress } from "@/lib/order-types";

export const dynamic = "force-dynamic";

type FullOrder = AnalyticsOrder & {
  tracking_numbers?: TrackingEntry[] | null;
  stripe_fee_cents?: number | null;
};

function sumCents(orders: FullOrder[]): number {
  return Math.round(orders.reduce((s, o) => s + (o.shipping_label_cost ?? 0) * 100, 0));
}

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { allowed } = rateLimit(session.user.id, 60, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const region = parseRegion(searchParams.get("region"));
  const { from, to } = parseDateParams(searchParams.get("from"), searchParams.get("to"));
  const focus = parseFocus(searchParams.get("focusDim"), searchParams.get("focusVal"));

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, fulfillment_status, created_at, fulfilled_at, order_total_cents, " +
      "shipping_address, shipping_label_cost, stripe_fee_cents, order_summary, order_data, " +
      "tracking_numbers, customer_name, customer_email"
    )
    .neq("fulfillment_status", "cancelled");

  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  const now = new Date();
  const all = (data ?? []) as unknown as FullOrder[];
  const filtered = all.filter(
    (o) =>
      matchesRegion(o, region) &&
      matchesDateRange(o.created_at, from, to) &&
      orderMatchesFocus(o, focus, now)
  );

  const index = createOrderIndex();
  const idxOf = (o: FullOrder) => index.idx(o.id);

  // ── Fulfillment speed ───────────────────────────────────────────────────────
  const fulfilled = filtered.filter((o) => o.fulfillment_status === "fulfilled" && o.fulfilled_at);
  const totalFulfillDays = fulfilled.reduce((s, o) => {
    return s + (new Date(o.fulfilled_at!).getTime() - new Date(o.created_at).getTime()) / 864e5;
  }, 0);
  const avgDaysToFulfill = fulfilled.length > 0
    ? Math.round((totalFulfillDays / fulfilled.length) * 10) / 10
    : null;

  // ── Unfulfilled by age ─────────────────────────────────────────────────────
  const unfulfilled = filtered.filter(
    (o) => o.fulfillment_status === "pending" || o.fulfillment_status === "processing"
  );
  const unfulfilledByAge = AGE_BUCKETS.map((b) => {
    const inBucket = unfulfilled.filter((o) => {
      const age = orderAgeDays(o, now);
      return age >= b.min && age <= b.max;
    });
    return { label: b.label, count: inBucket.length, o: inBucket.map(idxOf) };
  });

  // ── Status breakdown ────────────────────────────────────────────────────────
  const STATUSES = ["pending", "processing", "fulfilled"] as const;
  const statusCounts = Object.fromEntries(
    STATUSES.map((s) => {
      const rows = filtered.filter((o) => o.fulfillment_status === s);
      return [s, { count: rows.length, o: rows.map(idxOf) }];
    })
  ) as Record<(typeof STATUSES)[number], { count: number; o: number[] }>;

  // ── Shipping cost helpers ────────────────────────────────────────────────────
  const labeled    = filtered.filter((o) => o.shipping_label_cost != null && o.shipping_label_cost > 0);
  const withFees   = filtered.filter((o) => (o.stripe_fee_cents ?? 0) > 0);
  const totalFeeCents = withFees.reduce((s, o) => s + (o.stripe_fee_cents ?? 0), 0);
  const avgFeeCents   = withFees.length > 0 ? Math.round(totalFeeCents / withFees.length) : 0;
  const totalShippingCents = sumCents(labeled);
  const avgShippingCents   = labeled.length > 0 ? Math.round(totalShippingCents / labeled.length) : 0;
  const totalRevCents      = filtered.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const shippingPctOfRev   = totalRevCents > 0 ? Math.round((totalShippingCents / totalRevCents) * 1000) / 10 : null;

  // ── Per-carrier breakdown ───────────────────────────────────────────────────
  const carrierMap = new Map<string, { shippingCents: number; count: number; o: number[] }>();
  for (const o of labeled) {
    const carrier = inferCarrier(o.tracking_numbers);
    const cur = carrierMap.get(carrier) ?? { shippingCents: 0, count: 0, o: [] };
    cur.shippingCents += Math.round((o.shipping_label_cost ?? 0) * 100);
    cur.count += 1;
    cur.o.push(idxOf(o));
    carrierMap.set(carrier, cur);
  }
  const byCarrier = [...carrierMap.entries()]
    .map(([carrier, v]) => ({
      carrier,
      shippingCents: v.shippingCents,
      count:         v.count,
      avgCents:      Math.round(v.shippingCents / v.count),
      o:             v.o,
    }))
    .sort((a, b) => b.shippingCents - a.shippingCents);

  // ── Per-country breakdown ───────────────────────────────────────────────────
  // `count` counts labelled orders only (it pairs with shippingCents), but the
  // drill set is every order to that country — that's what the row represents.
  const countryMap = new Map<string, { shippingCents: number; count: number; revCents: number; o: number[] }>();
  for (const o of filtered) {
    const addr = o.shipping_address as ShippingAddress | null;
    const country = (addr?.country ?? "Unknown").toUpperCase();
    const cur = countryMap.get(country) ?? { shippingCents: 0, count: 0, revCents: 0, o: [] };
    if (o.shipping_label_cost != null && o.shipping_label_cost > 0) {
      cur.shippingCents += Math.round(o.shipping_label_cost * 100);
      cur.count += 1;
    }
    cur.revCents += o.order_total_cents ?? 0;
    cur.o.push(idxOf(o));
    countryMap.set(country, cur);
  }
  const byCountry = [...countryMap.entries()]
    .map(([country, v]) => ({
      country,
      shippingCents: v.shippingCents,
      count:         v.count,
      avgCents:      v.count > 0 ? Math.round(v.shippingCents / v.count) : 0,
      revCents:      v.revCents,
      o:             v.o,
    }))
    .sort((a, b) => b.shippingCents - a.shippingCents);

  // ── Per-state breakdown (US only) ───────────────────────────────────────────
  const stateMap = new Map<string, { shippingCents: number; count: number; o: number[] }>();
  for (const o of labeled) {
    const addr = o.shipping_address as ShippingAddress | null;
    const country = (addr?.country ?? "").toUpperCase();
    if (country !== "US") continue;
    const state = (addr?.state ?? "Unknown").toUpperCase();
    const cur = stateMap.get(state) ?? { shippingCents: 0, count: 0, o: [] };
    cur.shippingCents += Math.round((o.shipping_label_cost ?? 0) * 100);
    cur.count += 1;
    cur.o.push(idxOf(o));
    stateMap.set(state, cur);
  }
  const byState = [...stateMap.entries()]
    .map(([state, v]) => ({
      state,
      shippingCents: v.shippingCents,
      count:         v.count,
      avgCents:      Math.round(v.shippingCents / v.count),
      o:             v.o,
    }))
    .sort((a, b) => b.avgCents - a.avgCents);

  return NextResponse.json({
    stats: {
      totalOrders:      filtered.length,
      fulfilledCount:   fulfilled.length,
      unfulfilledCount: unfulfilled.length,
      avgDaysToFulfill,
      totalShippingCents,
      avgShippingCents,
      shippingPctOfRev,
      labeledOrders:    labeled.length,
      totalFeeCents,
      avgFeeCents,
      ordersWithFee:    withFees.length,
      // Drill sets for the KPI cards
      o: {
        totalOrders:      filtered.map(idxOf),
        fulfilled:        fulfilled.map(idxOf),
        unfulfilled:      unfulfilled.map(idxOf),
        labeled:          labeled.map(idxOf),
        withFees:         withFees.map(idxOf),
      },
    },
    unfulfilledByAge,
    statusCounts,
    byCarrier,
    byCountry,
    byState,
    orderIds: index.ids(),
  });
}
