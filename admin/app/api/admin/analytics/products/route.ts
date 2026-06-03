// GET /api/admin/analytics/products
// Returns full product breakdown with sortable metrics.
// Query params: from, to, region, sort (revenue|units|orders|revPerUnit)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import {
  parseRegion, matchesRegion, matchesDateRange, parseDateParams,
  getOrderItems, fmtPct, detectOrderKind, normalizeProductName,
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
  const sort = searchParams.get("sort") ?? "revenue";

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_total_cents, order_data, order_summary, created_at, shipping_address, customer_email")
    .neq("fulfillment_status", "cancelled");

  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  const orders = (data ?? []) as unknown as AnalyticsOrder[];
  const filtered = orders.filter(
    (o) => matchesRegion(o, region) && matchesDateRange(o.created_at, from, to)
  );

  // Only count product orders (exclude event registrations from product analytics)
  const productOrders = filtered.filter((o) => detectOrderKind(o) === "product");
  const totalRevenue = productOrders.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);

  // Build product map
  type ProdEntry = {
    name: string;
    revenue: number;
    units: number;
    orders: Set<string>;
    buyers: Set<string>;
  };
  const prodMap = new Map<string, ProdEntry>();

  for (const o of productOrders) {
    for (const item of getOrderItems(o)) {
      const name = normalizeProductName(item.product_name ?? "Unknown");
      if (!prodMap.has(name)) {
        prodMap.set(name, { name, revenue: 0, units: 0, orders: new Set(), buyers: new Set() });
      }
      const entry = prodMap.get(name)!;
      entry.revenue += item.amount_total_cents ?? 0;
      entry.units   += item.quantity ?? 1;
      entry.orders.add(o.id);
      if (o.customer_email) entry.buyers.add(o.customer_email.toLowerCase());
    }
  }

  const products = [...prodMap.values()]
    .map((p) => ({
      name:         p.name,
      revenue:      p.revenue,
      units:        p.units,
      orders:       p.orders.size,
      uniqueBuyers: p.buyers.size,
      revPerUnit:   p.units > 0 ? Math.round(p.revenue / p.units) : 0,
      pctOfTotal:   fmtPct(p.revenue, totalRevenue),
    }));

  const sortFns: Record<string, (a: (typeof products)[0], b: (typeof products)[0]) => number> = {
    revenue:   (a, b) => b.revenue - a.revenue,
    units:     (a, b) => b.units - a.units,
    orders:    (a, b) => b.orders - a.orders,
    revPerUnit:(a, b) => b.revPerUnit - a.revPerUnit,
  };
  products.sort(sortFns[sort] ?? sortFns.revenue);

  return NextResponse.json({ products, totalRevenue });
}
