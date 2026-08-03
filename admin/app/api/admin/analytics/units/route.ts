// GET /api/admin/analytics/units
//
// Units sold per period, at two levels:
//   · `skus`       — what was sold, as sold (one Partners Pack = 1 unit)
//   · `components` — the same sales exploded into base units (4 rackets, 3 balls)
//
// Anything we couldn't decompose comes back in `unmapped` so it's visible in
// the UI rather than silently missing from the component totals.
//
// Query params: from, to, region, period (week|month|quarter|year)

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import { fetchAllOrders } from "@/lib/server/fetch-orders";
import {
  parseRegion, matchesRegion, matchesDateRange, parseDateParams,
  getOrderItems, detectOrderKind, normalizeProductName,
  periodKey, periodLabel, enumeratePeriods,
  type Period,
} from "@/lib/analytics-utils";
import {
  resolveBom, COMPONENT_ORDER, COMPONENT_LABELS, BALL_PACK_SIZES,
  type ComponentId, type BallPackSize,
} from "@/lib/product-bom";

export const dynamic = "force-dynamic";

const ORDER_COLUMNS =
  "id, order_total_cents, order_data, order_summary, created_at, " +
  "shipping_address, customer_email, fulfillment_status";

function parsePeriod(raw: string | null): Period {
  return raw === "week" || raw === "quarter" || raw === "year" ? raw : "month";
}

/** Accumulates a per-period tally for one row of the report. */
type Row = { total: number; byPeriod: Map<string, number> };

function bump<K>(map: Map<K, Row>, key: K, period: string, n: number) {
  let row = map.get(key);
  if (!row) {
    row = { total: 0, byPeriod: new Map() };
    map.set(key, row);
  }
  row.total += n;
  row.byPeriod.set(period, (row.byPeriod.get(period) ?? 0) + n);
}

function toObject(row: Row | undefined): Record<string, number> {
  return Object.fromEntries(row?.byPeriod ?? []);
}

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { allowed } = rateLimit(session.user.id, 60, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const region = parseRegion(searchParams.get("region"));
  const period = parsePeriod(searchParams.get("period"));
  const { from, to } = parseDateParams(searchParams.get("from"), searchParams.get("to"));

  const { orders, error } = await fetchAllOrders(ORDER_COLUMNS);
  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  // Product sales only — event registrations are counted elsewhere.
  const scoped = orders.filter(
    (o) =>
      matchesRegion(o, region) &&
      matchesDateRange(o.created_at, from, to) &&
      detectOrderKind(o) === "product"
  );

  const skuUnits   = new Map<string, Row>();
  const skuRevenue = new Map<string, Row>();
  const components = new Map<ComponentId, Row>();
  const ballPacks  = new Map<BallPackSize, Row>();
  const unmapped   = new Map<string, Row>();
  const inferred   = new Map<string, number>();

  for (const order of scoped) {
    const pKey = periodKey(new Date(order.created_at), period);

    for (const item of getOrderItems(order)) {
      const qty  = item.quantity ?? 1;
      const raw  = (item.product_name ?? item.slug ?? "Unknown").trim();
      const { bom, source } = resolveBom(item);

      if (source === "non_goods") continue;

      // SKU level — grouped the same way the Products tab groups, so the two
      // tabs can be cross-checked against each other.
      bump(skuUnits,   normalizeProductName(raw), pKey, qty);
      bump(skuRevenue, normalizeProductName(raw), pKey, item.amount_total_cents ?? 0);

      if (source === "unmapped") {
        bump(unmapped, raw, pKey, qty);
        continue;
      }
      if (source === "inferred") {
        inferred.set(raw, (inferred.get(raw) ?? 0) + qty);
      }

      for (const [id, n] of Object.entries(bom.components)) {
        bump(components, id as ComponentId, pKey, (n ?? 0) * qty);
      }
      for (const [size, n] of Object.entries(bom.ballPacks ?? {})) {
        bump(ballPacks, Number(size) as BallPackSize, pKey, (n ?? 0) * qty);
      }
    }
  }

  // Period columns. Use the requested window when given so empty periods still
  // appear; otherwise derive the span from the data itself.
  let periods: string[] = [];
  if (scoped.length > 0) {
    const times = scoped.map((o) => new Date(o.created_at).getTime());
    const start = from ?? new Date(Math.min(...times));
    const end   = to   ?? new Date(Math.max(...times));
    periods = enumeratePeriods(start, end, period);
  }

  return NextResponse.json({
    period,
    periods: periods.map((key) => ({ key, label: periodLabel(key, period) })),
    orderCount: scoped.length,

    skus: [...skuUnits.entries()]
      .map(([name, row]) => ({
        name,
        total:           row.total,
        byPeriod:        toObject(row),
        revenue:         skuRevenue.get(name)?.total ?? 0,
        revenueByPeriod: toObject(skuRevenue.get(name)),
      }))
      .sort((a, b) => b.total - a.total),

    components: COMPONENT_ORDER
      .filter((id) => (components.get(id)?.total ?? 0) > 0)
      .map((id) => ({
        id,
        label:    COMPONENT_LABELS[id],
        total:    components.get(id)!.total,
        byPeriod: toObject(components.get(id)),
      })),

    ballPacks: BALL_PACK_SIZES
      .filter((size) => (ballPacks.get(size)?.total ?? 0) > 0)
      .map((size) => ({
        size,
        label:    `${size}-packs`,
        total:    ballPacks.get(size)!.total,
        byPeriod: toObject(ballPacks.get(size)),
      })),

    unmapped: [...unmapped.entries()]
      .map(([name, row]) => ({ name, units: row.total, byPeriod: toObject(row) }))
      .sort((a, b) => b.units - a.units),

    inferred: [...inferred.entries()]
      .map(([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units),
  });
}
