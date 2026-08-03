// GET /api/admin/analytics/customers
// Returns repeat-customer KPIs, leaderboard, item breakdown, segments.
//
// Every row carries `o` — indices into the top-level `orderIds` table — so any
// figure can be drilled back to the orders that produced it.
//
// Query params: from, to, region, focusDim, focusVal

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import {
  parseRegion, matchesRegion, matchesDateRange, parseDateParams,
  getOrderItems, fmtPct, normalizeProductName,
  createOrderIndex, parseFocus, orderMatchesFocus,
  type AnalyticsOrder,
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
  const focus = parseFocus(searchParams.get("focusDim"), searchParams.get("focusVal"));

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, customer_email, customer_name, order_total_cents, created_at, " +
      "shipping_address, order_data, fulfillment_status, tracking_numbers"
    )
    .neq("fulfillment_status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  const now = new Date();
  const all = (data ?? []) as AnalyticsOrder[];

  const filtered = all.filter(
    (o) =>
      matchesRegion(o, region) &&
      matchesDateRange(o.created_at, from, to) &&
      orderMatchesFocus(o, focus, now)
  );

  const index = createOrderIndex();
  const idxOf = (o: AnalyticsOrder) => index.idx(o.id);
  const idxAll = (orders: AnalyticsOrder[]) => orders.map(idxOf);

  // Group by email
  type CustomerRecord = { email: string; name: string | null; orders: AnalyticsOrder[] };

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
  const sameAddr: CustomerRecord[] = [];
  const diffAddr: CustomerRecord[] = [];
  for (const c of repeatCustomers) {
    const keys = new Set(c.orders.map((o) => addrKey(o.shipping_address)));
    (keys.size === 1 ? sameAddr : diffAddr).push(c);
  }
  const repeatTotal = repeatCustomers.length;
  const sameAddressPct = repeatTotal > 0 ? fmtPct(sameAddr.length, repeatTotal) : null;
  const diffAddressPct = repeatTotal > 0 ? fmtPct(diffAddr.length, repeatTotal) : null;
  const flatten = (cs: CustomerRecord[]) => idxAll(cs.flatMap((c) => c.orders));

  // Items purchased by repeat customers.
  // Names are normalised so this card groups the same way the Products and
  // Units tabs do — otherwise "SkyBall Essentials – Pro Kit" and its historical
  // spellings would appear as separate products here only.
  const repeatEmails = new Set(repeatCustomers.map((c) => c.email));
  const repeatOrders = filtered.filter((o) => repeatEmails.has((o.customer_email ?? "").toLowerCase()));
  const itemCounts = new Map<string, { purchases: number; o: Set<number> }>();
  for (const o of repeatOrders) {
    for (const item of getOrderItems(o)) {
      const name = normalizeProductName(item.product_name ?? "Unknown");
      const cur = itemCounts.get(name) ?? { purchases: 0, o: new Set<number>() };
      cur.purchases += item.quantity ?? 1;
      cur.o.add(idxOf(o));
      itemCounts.set(name, cur);
    }
  }
  const repeatItemBreakdown = [...itemCounts.entries()]
    .map(([name, v]) => ({ name, purchases: v.purchases, o: [...v.o] }))
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
      o: idxAll(c.orders),
    }))
    .sort((a, b) => b.orderCount - a.orderCount || b.totalSpentCents - a.totalSpentCents);

  // Segments
  const segmentDefs: { label: string; test: (n: number) => boolean }[] = [
    { label: "1 order",    test: (n) => n === 1 },
    { label: "2–3 orders", test: (n) => n >= 2 && n <= 3 },
    { label: "4–9 orders", test: (n) => n >= 4 && n <= 9 },
    { label: "10+ orders", test: (n) => n >= 10 },
  ];
  const segments = segmentDefs.map(({ label, test }) => {
    const members = customers.filter((c) => test(c.orders.length));
    return { label, count: members.length, o: flatten(members) };
  });

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
      o: {
        allCustomers: idxAll(filtered),
        repeat:       flatten(repeatCustomers),
        oneTime:      flatten(oneTimeCustomers),
        sameAddress:  flatten(sameAddr),
        diffAddress:  flatten(diffAddr),
      },
    },
    leaderboard,
    repeatItemBreakdown,
    segments,
    orderIds: index.ids(),
  });
}
