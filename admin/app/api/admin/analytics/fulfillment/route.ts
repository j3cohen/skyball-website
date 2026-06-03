// GET /api/admin/analytics/fulfillment
// Returns fulfillment speed, unfulfilled aging, shipping cost breakdowns.
// Query params: from, to, region

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import {
  parseRegion, matchesRegion, matchesDateRange, parseDateParams,
  type AnalyticsOrder,
} from "@/lib/analytics-utils";
import type { ShippingAddress } from "@/lib/order-types";

export const dynamic = "force-dynamic";

type TrackingEntry = { number: string; tracking_status: string; added_at: string };

type FullOrder = AnalyticsOrder & {
  tracking_numbers?: TrackingEntry[] | null;
};

function inferCarrier(trackingNumbers: TrackingEntry[] | null | undefined): string {
  const tn = trackingNumbers?.[0]?.number ?? "";
  if (tn.startsWith("1Z"))                              return "UPS";
  if (/^9[2-4]\d{18,20}$/.test(tn))                    return "USPS";
  if (/^(\d{12,14}|\d{15,22})$/.test(tn) && !tn.startsWith("1Z")) return "USPS";
  if (/^[37]\d{11}$/.test(tn))                          return "FedEx";
  if (tn.length > 0)                                    return "Other";
  return "No label";
}

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

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, fulfillment_status, created_at, fulfilled_at, order_total_cents, " +
      "shipping_address, shipping_label_cost, order_summary, order_data, " +
      "tracking_numbers, customer_name, customer_email"
    )
    .neq("fulfillment_status", "cancelled");

  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  const all = (data ?? []) as unknown as FullOrder[];
  const filtered = all.filter(
    (o) => matchesRegion(o, region) && matchesDateRange(o.created_at, from, to)
  );

  const now = new Date();

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
  const ageBuckets = [
    { label: "< 3 days",  min: 0,  max: 2  },
    { label: "3–7 days",  min: 3,  max: 7  },
    { label: "8–14 days", min: 8,  max: 14 },
    { label: "15+ days",  min: 15, max: Infinity },
  ];
  const unfulfilledByAge = ageBuckets.map((b) => ({
    label: b.label,
    count: unfulfilled.filter((o) => {
      const age = (now.getTime() - new Date(o.created_at).getTime()) / 864e5;
      return age >= b.min && age <= b.max;
    }).length,
  }));

  // ── Status breakdown ────────────────────────────────────────────────────────
  const statusCounts = { pending: 0, processing: 0, fulfilled: 0 };
  for (const o of filtered) {
    if (o.fulfillment_status in statusCounts) {
      statusCounts[o.fulfillment_status as keyof typeof statusCounts]++;
    }
  }

  // ── Shipping cost helpers ────────────────────────────────────────────────────
  const labeled = filtered.filter((o) => o.shipping_label_cost != null && o.shipping_label_cost > 0);
  const totalShippingCents = sumCents(labeled);
  const avgShippingCents   = labeled.length > 0 ? Math.round(totalShippingCents / labeled.length) : 0;
  const totalRevCents      = filtered.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const shippingPctOfRev   = totalRevCents > 0 ? Math.round((totalShippingCents / totalRevCents) * 1000) / 10 : null;

  // ── Per-carrier breakdown ───────────────────────────────────────────────────
  const carrierMap = new Map<string, { shippingCents: number; count: number }>();
  for (const o of labeled) {
    const carrier = inferCarrier(o.tracking_numbers);
    const cur = carrierMap.get(carrier) ?? { shippingCents: 0, count: 0 };
    cur.shippingCents += Math.round((o.shipping_label_cost ?? 0) * 100);
    cur.count += 1;
    carrierMap.set(carrier, cur);
  }
  const byCarrier = [...carrierMap.entries()]
    .map(([carrier, v]) => ({
      carrier,
      shippingCents: v.shippingCents,
      count:         v.count,
      avgCents:      Math.round(v.shippingCents / v.count),
    }))
    .sort((a, b) => b.shippingCents - a.shippingCents);

  // ── Per-country breakdown ───────────────────────────────────────────────────
  const countryMap = new Map<string, { shippingCents: number; count: number; revCents: number }>();
  for (const o of filtered) {
    const addr = o.shipping_address as ShippingAddress | null;
    const country = (addr?.country ?? "Unknown").toUpperCase();
    const cur = countryMap.get(country) ?? { shippingCents: 0, count: 0, revCents: 0 };
    if (o.shipping_label_cost != null && o.shipping_label_cost > 0) {
      cur.shippingCents += Math.round(o.shipping_label_cost * 100);
      cur.count += 1;
    }
    cur.revCents += o.order_total_cents ?? 0;
    countryMap.set(country, cur);
  }
  const byCountry = [...countryMap.entries()]
    .map(([country, v]) => ({
      country,
      shippingCents: v.shippingCents,
      count:         v.count,
      avgCents:      v.count > 0 ? Math.round(v.shippingCents / v.count) : 0,
      revCents:      v.revCents,
    }))
    .sort((a, b) => b.shippingCents - a.shippingCents);

  // ── Per-state breakdown (US only) ───────────────────────────────────────────
  const stateMap = new Map<string, { shippingCents: number; count: number }>();
  for (const o of labeled) {
    const addr = o.shipping_address as ShippingAddress | null;
    const country = (addr?.country ?? "").toUpperCase();
    if (country !== "US") continue;
    const state = (addr?.state ?? "Unknown").toUpperCase();
    const cur = stateMap.get(state) ?? { shippingCents: 0, count: 0 };
    cur.shippingCents += Math.round((o.shipping_label_cost ?? 0) * 100);
    cur.count += 1;
    stateMap.set(state, cur);
  }
  const byState = [...stateMap.entries()]
    .map(([state, v]) => ({
      state,
      shippingCents: v.shippingCents,
      count:         v.count,
      avgCents:      Math.round(v.shippingCents / v.count),
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
    },
    unfulfilledByAge,
    statusCounts,
    byCarrier,
    byCountry,
    byState,
  });
}
