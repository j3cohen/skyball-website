// GET /api/admin/analytics/customers
// Returns repeat-customer KPIs, leaderboard, item breakdown, segments.
// Query params: from, to, region

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import {
  parseRegion, matchesRegion, matchesDateRange, parseDateParams,
  getOrderItems, fmtPct, type AnalyticsOrder,
} from "@/lib/analytics-utils";
import type { ShippingAddress } from "@/lib/order-types";

export const dynamic = "force-dynamic";

function addrKey(addr: Record<string, unknown> | null): string {
  const a = addr as ShippingAddress | null;
  return [a?.postal_code ?? "", a?.country ?? ""].join("|").toLowerCase();
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
      "id, customer_email, customer_name, order_total_cents, created_at, shipping_address, order_data"
    )
    .neq("fulfillment_status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  const all = (data ?? []) as AnalyticsOrder[];

  // Apply region + date filters
  const filtered = all.filter(
    (o) => matchesRegion(o, region) && matchesDateRange(o.created_at, from, to)
  );

  // Group by email
  type CustomerRecord = {
    email: string;
    name: string | null;
    orders: AnalyticsOrder[];
  };

  const byEmail = new Map<string, CustomerRecord>();
  for (const o of filtered) {
    const key = (o.customer_email ?? "").toLowerCase().trim();
    if (!key) continue;
    if (!byEmail.has(key)) byEmail.set(key, { email: key, name: o.customer_name, orders: [] });
    byEmail.get(key)!.orders.push(o);
  }

  const customers = [...byEmail.values()];
  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter((c) => c.orders.length >= 2);
  const oneTimeCustomers = customers.filter((c) => c.orders.length === 1);

  // Avg days between orders (repeat customers only)
  let totalGapDays = 0;
  let gapCount = 0;
  for (const c of repeatCustomers) {
    const dates = c.orders.map((o) => new Date(o.created_at).getTime()).sort((a, b) => a - b);
    for (let i = 1; i < dates.length; i++) {
      totalGapDays += (dates[i] - dates[i - 1]) / 864e5;
      gapCount++;
    }
  }
  const avgDaysBetweenOrders = gapCount > 0 ? Math.round(totalGapDays / gapCount) : null;

  // Same vs different shipping address (repeat customers only)
  let sameCount = 0;
  let diffCount = 0;
  for (const c of repeatCustomers) {
    const keys = new Set(c.orders.map((o) => addrKey(o.shipping_address)));
    if (keys.size === 1) sameCount++;
    else diffCount++;
  }
  const repeatTotal = repeatCustomers.length;
  const sameAddressPct  = repeatTotal > 0 ? fmtPct(sameCount, repeatTotal) : null;
  const diffAddressPct  = repeatTotal > 0 ? fmtPct(diffCount, repeatTotal) : null;

  // Items purchased by repeat customers
  const repeatEmails = new Set(repeatCustomers.map((c) => c.email));
  const repeatOrders = filtered.filter((o) => repeatEmails.has((o.customer_email ?? "").toLowerCase()));
  const itemCounts = new Map<string, number>();
  for (const o of repeatOrders) {
    for (const item of getOrderItems(o)) {
      const name = item.product_name ?? "Unknown";
      itemCounts.set(name, (itemCounts.get(name) ?? 0) + (item.quantity ?? 1));
    }
  }
  const repeatItemBreakdown = [...itemCounts.entries()]
    .map(([name, purchases]) => ({ name, purchases }))
    .sort((a, b) => b.purchases - a.purchases);

  // Customer leaderboard (all customers, sorted by order count desc)
  const leaderboard = customers
    .map((c) => ({
      email: c.email,
      name: c.name,
      orderCount: c.orders.length,
      totalSpentCents: c.orders.reduce((s, o) => s + (o.order_total_cents ?? 0), 0),
      firstOrder: c.orders[0].created_at,
      lastOrder:  c.orders[c.orders.length - 1].created_at,
    }))
    .sort((a, b) => b.orderCount - a.orderCount || b.totalSpentCents - a.totalSpentCents);

  // Segments
  const segments = [
    { label: "1 order",     count: oneTimeCustomers.length },
    { label: "2–3 orders",  count: customers.filter((c) => c.orders.length >= 2 && c.orders.length <= 3).length },
    { label: "4–9 orders",  count: customers.filter((c) => c.orders.length >= 4 && c.orders.length <= 9).length },
    { label: "10+ orders",  count: customers.filter((c) => c.orders.length >= 10).length },
  ];

  // Avg spend: repeat vs one-time
  const repeatAvgSpend = repeatCustomers.length > 0
    ? Math.round(repeatCustomers.reduce((s, c) => s + c.orders.reduce((a, o) => a + (o.order_total_cents ?? 0), 0), 0) / repeatCustomers.length)
    : 0;
  const oneTimeAvgSpend = oneTimeCustomers.length > 0
    ? Math.round(oneTimeCustomers.reduce((s, c) => s + (c.orders[0].order_total_cents ?? 0), 0) / oneTimeCustomers.length)
    : 0;

  return NextResponse.json({
    stats: {
      totalCustomers,
      repeatCustomers: repeatCustomers.length,
      repeatPct: fmtPct(repeatCustomers.length, totalCustomers),
      avgDaysBetweenOrders,
      sameAddressPct,
      diffAddressPct,
      repeatAvgSpendCents: repeatAvgSpend,
      oneTimeAvgSpendCents: oneTimeAvgSpend,
    },
    leaderboard,
    repeatItemBreakdown,
    segments,
  });
}
