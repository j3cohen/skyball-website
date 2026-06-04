// GET /api/admin/analytics/revenue
// Returns revenue stats, time series, product breakdown, country/region breakdown.
// Query params: from (ISO), to (ISO), region (all|domestic|international|CC)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import {
  parseRegion, matchesRegion, matchesDateRange, parseDateParams,
  getPrevPeriod, getGranularity, dateKey, fillSeries,
  orderCountry, getOrderItems, fmtPct, deltaLabel,
  detectOrderKind, normalizeProductName,
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
  const { prevFrom, prevTo } = getPrevPeriod(from, to);

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, customer_email, order_total_cents, order_currency, fulfillment_status, " +
      "created_at, fulfilled_at, shipping_address, order_data, order_summary, " +
      "shipping_label_cost, stripe_fee_cents, customer_name"
    )
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  const all = (data ?? []) as unknown as AnalyticsOrder[];

  // Main period — exclude cancelled
  const main = all.filter(
    (o) =>
      o.fulfillment_status !== "cancelled" &&
      matchesRegion(o, region) &&
      matchesDateRange(o.created_at, from, to)
  );

  // All orders in period (including cancelled) for status breakdown
  const mainAll = all.filter(
    (o) => matchesRegion(o, region) && matchesDateRange(o.created_at, from, to)
  );

  // Previous period for comparison
  const prev = prevFrom
    ? all.filter(
        (o) =>
          o.fulfillment_status !== "cancelled" &&
          matchesRegion(o, region) &&
          matchesDateRange(o.created_at, prevFrom, prevTo)
      )
    : [];

  // ── Separate product vs event orders ──────────────────────────────────────
  const productOrders    = main.filter((o) => detectOrderKind(o) === "product");
  const tournamentOrders = main.filter((o) => detectOrderKind(o) === "tournament");
  const openPlayOrders   = main.filter((o) => detectOrderKind(o) === "open_play");
  const eventOrders      = [...tournamentOrders, ...openPlayOrders];

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCents      = main.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const productCents    = productOrders.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const eventCents      = eventOrders.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const tournamentCents = tournamentOrders.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const openPlayCents   = openPlayOrders.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);

  const orderCount      = main.length;
  const uniqueCustomers = new Set(main.map((o) => o.customer_email?.toLowerCase()).filter(Boolean)).size;
  const avgOrderCents   = orderCount > 0 ? Math.round(totalCents / orderCount) : 0;
  const fulfilledCount  = main.filter((o) => o.fulfillment_status === "fulfilled").length;

  const prevTotalCents  = prev.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const prevOrderCount  = prev.length;
  const prevAvg         = prevOrderCount > 0 ? Math.round(prevTotalCents / prevOrderCount) : 0;

  // ── Region breakdown ───────────────────────────────────────────────────────
  const domestic      = main.filter((o) => orderCountry(o) === "US");
  const international = main.filter((o) => orderCountry(o) !== "US" && orderCountry(o) !== "");
  const unknown       = main.filter((o) => orderCountry(o) === "");

  const countryMap = new Map<string, { cents: number; count: number }>();
  for (const o of main) {
    const c = orderCountry(o) || "Unknown";
    const cur = countryMap.get(c) ?? { cents: 0, count: 0 };
    cur.cents += o.order_total_cents ?? 0;
    cur.count += 1;
    countryMap.set(c, cur);
  }
  const countryBreakdown = [...countryMap.entries()]
    .map(([country, v]) => ({ country, ...v }))
    .sort((a, b) => b.cents - a.cents);

  // ── Time series ────────────────────────────────────────────────────────────
  const gran = getGranularity(from, to);
  const seriesMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of main) {
    const k = dateKey(new Date(o.created_at), gran);
    const cur = seriesMap.get(k) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.order_total_cents ?? 0;
    cur.orders += 1;
    seriesMap.set(k, cur);
  }
  const timeSeries =
    from
      ? fillSeries(seriesMap, from, to ?? new Date(), gran)
      : [...seriesMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, v]) => ({ date, ...v }));

  // ── Product breakdown (normalized names, product orders only) ─────────────
  const prodRevenue = new Map<string, number>();
  const prodUnits   = new Map<string, number>();
  for (const o of productOrders) {
    for (const item of getOrderItems(o)) {
      const name = normalizeProductName(item.product_name ?? "Unknown");
      prodRevenue.set(name, (prodRevenue.get(name) ?? 0) + (item.amount_total_cents ?? 0));
      prodUnits.set(name, (prodUnits.get(name) ?? 0) + (item.quantity ?? 1));
    }
  }
  const productBreakdown = [...prodRevenue.entries()]
    .map(([name, revenue]) => ({
      name,
      revenue,
      units:      prodUnits.get(name) ?? 0,
      revPerUnit: prodUnits.get(name) ? Math.round(revenue / (prodUnits.get(name) ?? 1)) : 0,
      pctOfTotal: fmtPct(revenue, productCents),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Event breakdown ────────────────────────────────────────────────────────
  // Summarise individual events (group by order_summary for tournaments/open-play)
  const eventNameMap = new Map<string, { cents: number; count: number; kind: string }>();
  for (const o of eventOrders) {
    const kind = detectOrderKind(o);
    // For tournaments, use summary. For open play, normalise to "Open Play" or specific date
    const label = (o.order_summary ?? "Event").replace(/\s*\|\s*Total:.*$/, "").trim();
    const cur = eventNameMap.get(label) ?? { cents: 0, count: 0, kind };
    cur.cents += o.order_total_cents ?? 0;
    cur.count += 1;
    eventNameMap.set(label, cur);
  }
  const eventBreakdown = [...eventNameMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.cents - a.cents);

  // ── Status breakdown ───────────────────────────────────────────────────────
  const statusMap = new Map<string, number>();
  for (const o of mainAll) {
    statusMap.set(o.fulfillment_status, (statusMap.get(o.fulfillment_status) ?? 0) + 1);
  }
  const statusBreakdown = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count, pct: fmtPct(count, mainAll.length) }))
    .sort((a, b) => b.count - a.count);

  // ── Stripe fees ────────────────────────────────────────────────────────────
  const ordersWithFee = main.filter((o) => (o.stripe_fee_cents ?? 0) > 0);
  const totalFeeCents = ordersWithFee.reduce((s, o) => s + (o.stripe_fee_cents ?? 0), 0);
  const avgFeeCents   = ordersWithFee.length > 0 ? Math.round(totalFeeCents / ordersWithFee.length) : 0;
  const feeAsPctOfRevenue = productCents > 0
    ? Math.round((totalFeeCents / productCents) * 1000) / 10
    : 0;

  // ── Shipping costs ─────────────────────────────────────────────────────────
  // shipping_label_cost is stored in dollars (NUMERIC); multiply by 100 for cents
  const ordersWithCost = main.filter((o) => o.shipping_label_cost != null && o.shipping_label_cost > 0);
  const totalShippingCents = Math.round(
    ordersWithCost.reduce((s, o) => s + (o.shipping_label_cost ?? 0) * 100, 0)
  );
  const avgShippingCents = ordersWithCost.length > 0
    ? Math.round(totalShippingCents / ordersWithCost.length)
    : 0;
  const shippingAsPctOfRevenue = productCents > 0
    ? Math.round((totalShippingCents / productCents) * 1000) / 10
    : 0;

  // ── Order value buckets ────────────────────────────────────────────────────
  const buckets = [
    { label: "Under $25",  min: 0,     max: 2499 },
    { label: "$25–$50",    min: 2500,  max: 4999 },
    { label: "$50–$100",   min: 5000,  max: 9999 },
    { label: "$100–$200",  min: 10000, max: 19999 },
    { label: "$200+",      min: 20000, max: Infinity },
  ];
  const orderValueBuckets = buckets.map((b) => ({
    label: b.label,
    count: main.filter((o) => {
      const c = o.order_total_cents ?? 0;
      return c >= b.min && c <= b.max;
    }).length,
  }));

  return NextResponse.json({
    stats: {
      totalCents,
      productCents,
      eventCents,
      orderCount,
      uniqueCustomers,
      avgOrderCents,
      fulfillmentRatePct: fmtPct(fulfilledCount, orderCount),
      prev: prevFrom
        ? {
            totalCents: prevTotalCents,
            orderCount: prevOrderCount,
            avgOrderCents: prevAvg,
            uniqueCustomers: new Set(prev.map((o) => o.customer_email?.toLowerCase()).filter(Boolean)).size,
          }
        : null,
      deltas: prevFrom
        ? {
            revenue:   deltaLabel(totalCents, prevTotalCents),
            orders:    deltaLabel(orderCount, prevOrderCount),
            avgOrder:  deltaLabel(avgOrderCents, prevAvg),
            customers: deltaLabel(uniqueCustomers, new Set(prev.map((o) => o.customer_email?.toLowerCase()).filter(Boolean)).size),
          }
        : null,
    },
    regionBreakdown: {
      domestic:      { cents: domestic.reduce((s, o) => s + (o.order_total_cents ?? 0), 0),      count: domestic.length },
      international: { cents: international.reduce((s, o) => s + (o.order_total_cents ?? 0), 0), count: international.length },
      unknown:       { cents: unknown.reduce((s, o) => s + (o.order_total_cents ?? 0), 0),        count: unknown.length },
    },
    eventRevenue: {
      totalCents:      eventCents,
      tournamentCents,
      openPlayCents,
      tournamentCount: tournamentOrders.length,
      openPlayCount:   openPlayOrders.length,
      breakdown:       eventBreakdown,
    },
    stripeFees: {
      totalCents:       totalFeeCents,
      avgCents:         avgFeeCents,
      ordersWithFee:    ordersWithFee.length,
      pctOfRevenue:     feeAsPctOfRevenue,
    },
    shippingCosts: {
      totalCents:       totalShippingCents,
      avgCents:         avgShippingCents,
      ordersWithLabel:  ordersWithCost.length,
      pctOfRevenue:     shippingAsPctOfRevenue,
    },
    netRevenue: {
      // Product revenue after deducting known Stripe fees + shipping labels
      productCents,
      totalFeesCents:   totalFeeCents + totalShippingCents,
      netCents:         productCents - totalFeeCents - totalShippingCents,
    },
    countryBreakdown,
    timeSeries,
    productBreakdown,
    statusBreakdown,
    orderValueBuckets,
    granularity: gran,
  });
}
