// GET /api/admin/analytics/fulfillment
// Returns fulfillment speed, unfulfilled aging, and shipping cost metrics.
// Query params: from, to, region

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import {
  parseRegion, matchesRegion, matchesDateRange, parseDateParams,
  type AnalyticsOrder,
} from "@/lib/analytics-utils";

export const dynamic = "force-dynamic";

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
      "id, fulfillment_status, created_at, fulfilled_at, " +
      "order_total_cents, shipping_address, shipping_label_cost"
    )
    .neq("fulfillment_status", "cancelled");

  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  const all = (data ?? []) as unknown as AnalyticsOrder[];
  const filtered = all.filter(
    (o) => matchesRegion(o, region) && matchesDateRange(o.created_at, from, to)
  );

  const now = new Date();

  // Avg days to fulfill (fulfilled orders only)
  const fulfilled = filtered.filter((o) => o.fulfillment_status === "fulfilled" && o.fulfilled_at);
  const totalFulfillDays = fulfilled.reduce((s, o) => {
    const created  = new Date(o.created_at).getTime();
    const fulfilledAt = new Date(o.fulfilled_at!).getTime();
    return s + (fulfilledAt - created) / 864e5;
  }, 0);
  const avgDaysToFulfill = fulfilled.length > 0
    ? Math.round((totalFulfillDays / fulfilled.length) * 10) / 10
    : null;

  // Unfulfilled orders by age
  const unfulfilled = filtered.filter(
    (o) => o.fulfillment_status === "pending" || o.fulfillment_status === "processing"
  );
  const ageBuckets = [
    { label: "< 3 days",   min: 0,  max: 2 },
    { label: "3–7 days",   min: 3,  max: 7 },
    { label: "8–14 days",  min: 8,  max: 14 },
    { label: "15+ days",   min: 15, max: Infinity },
  ];
  const unfulfilledByAge = ageBuckets.map((b) => ({
    label: b.label,
    count: unfulfilled.filter((o) => {
      const ageDays = (now.getTime() - new Date(o.created_at).getTime()) / 864e5;
      return ageDays >= b.min && ageDays <= b.max;
    }).length,
  }));

  // Shipping cost as % of order revenue
  const ordersWithCost = filtered.filter(
    (o) => o.shipping_label_cost != null && (o.order_total_cents ?? 0) > 0
  );
  const totalOrderValue = ordersWithCost.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const totalLabelCost  = ordersWithCost.reduce((s, o) => s + ((o.shipping_label_cost ?? 0) * 100), 0);
  const labelCostPct = totalOrderValue > 0
    ? Math.round((totalLabelCost / totalOrderValue) * 1000) / 10
    : null;

  // Status breakdown for period
  const statusCounts = { pending: 0, processing: 0, fulfilled: 0 };
  for (const o of filtered) {
    if (o.fulfillment_status in statusCounts) {
      statusCounts[o.fulfillment_status as keyof typeof statusCounts]++;
    }
  }

  return NextResponse.json({
    stats: {
      totalOrders: filtered.length,
      fulfilledCount: fulfilled.length,
      unfulfilledCount: unfulfilled.length,
      avgDaysToFulfill,
      labelCostPct,
    },
    unfulfilledByAge,
    statusCounts,
  });
}
