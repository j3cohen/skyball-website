"use client";

import { useState, useEffect, useCallback } from "react";
import AnalyticsFilters, {
  defaultFilters,
  analyticsParams,
  type AnalyticsFilterState,
  type FocusState,
} from "@/components/analytics-filters";
import DrillPanel, { makeTarget, type DrillTarget } from "@/components/drill-panel";
import DrillRow from "@/components/drill-row";
import { useDrillSync } from "@/lib/use-drill-sync";
import {
  RevenueAreaChart,
  OrdersBarChart,
  OrderValueBucketChart,
} from "@/components/revenue-charts";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function DeltaBadge({ delta }: { delta: number | null | undefined }) {
  if (delta == null) return null;
  const pos = delta >= 0;
  return (
    <span
      className={`ml-2 text-xs font-medium rounded-full px-1.5 py-0.5 ${
        pos ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
    >
      {pos ? "+" : ""}{delta}%
    </span>
  );
}

function StatCard({
  label, value, sub, delta, onDrill, count,
}: {
  label: string; value: string; sub?: string; delta?: number | null;
  onDrill?: () => void; count?: number;
}) {
  return (
    <DrillRow
      onDrill={onDrill}
      count={count}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4"
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-baseline">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <DeltaBadge delta={delta} />
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </DrillRow>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  fulfilled:  "bg-green-500",
  processing: "bg-blue-500",
  pending:    "bg-yellow-400",
  cancelled:  "bg-gray-300",
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom",
  AU: "Australia", DE: "Germany", FR: "France", JP: "Japan",
  MX: "Mexico", BR: "Brazil",
};

/** "Unknown" is the bucket for orders that have no shipping address at all. */
function countryLabel(code: string): string {
  if (!code || code.toUpperCase() === "UNKNOWN") return "Unknown / no address";
  return COUNTRY_NAMES[code] ?? code;
}

export default function RevenuePage() {
  const [filters, setFilters] = useState<AnalyticsFilterState>(defaultFilters);
  const [data, setData]       = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [drill, setDrill]     = useState<DrillTarget | null>(null);
  const [revMetric, setRevMetric] = useState<"revenue" | "avgDaily">("revenue");
  const [focus, setFocus]     = useState<FocusState | null>(null);

  const load = useCallback(async (f: AnalyticsFilterState, fo: FocusState | null) => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/admin/analytics/revenue?${analyticsParams(f, fo)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filters, focus); }, [filters, focus, load]);

  const stats            = data?.stats            as Record<string, unknown> | undefined;
  const regionBreakdown  = data?.regionBreakdown  as Record<string, unknown> | undefined;
  const countryBreakdown = data?.countryBreakdown as { country: string; cents: number; count: number; o: number[] }[] | undefined;
  const timeSeries       = data?.timeSeries       as { date: string; revenue: number; orders: number; o: number[] }[] | undefined;
  const productBreakdown = data?.productBreakdown as { name: string; revenue: number; units: number; pctOfTotal: number; o: number[] }[] | undefined;
  const statusBreakdown  = data?.statusBreakdown  as { status: string; count: number; pct: number; o: number[] }[] | undefined;
  const orderValueBuckets = data?.orderValueBuckets as { label: string; count: number; o: number[] }[] | undefined;
  const orderIds         = (data?.orderIds as string[]) ?? [];
  const avgDailyCents    = (stats?.avgDailyCents as number) ?? 0;
  const rangeDays        = (stats?.rangeDays as number) ?? 0;
  const statsO           = stats?.o as Record<string, number[]> | undefined;
  const granularity      = (data?.granularity as "day" | "week" | "month") ?? "month";
  const deltas           = stats?.deltas           as Record<string, number | null> | undefined;
  const shippingCosts    = data?.shippingCosts      as {
    totalCents: number; avgCents: number; ordersWithLabel: number; pctOfRevenue: number;
  } | undefined;
  const stripeFees       = data?.stripeFees         as {
    totalCents: number; avgCents: number; ordersWithFee: number; pctOfRevenue: number;
  } | undefined;
  const netRevenue       = data?.netRevenue         as {
    productCents: number; totalFeesCents: number; netCents: number;
  } | undefined;
  const eventRevenue     = data?.eventRevenue      as {
    totalCents: number; tournamentCents: number; openPlayCents: number;
    tournamentCount: number; openPlayCount: number;
    breakdown: { name: string; cents: number; count: number; kind: string; o: number[] }[];
  } | undefined;

  const domData = regionBreakdown?.domestic    as { cents: number; count: number; o: number[] } | undefined;
  const intlData = regionBreakdown?.international as { cents: number; count: number; o: number[] } | undefined;
  const totalCents = (stats?.totalCents as number) ?? 0;

  // Every drill target on this page is built here, then reused by both the
  // click handlers and the refresh below — one construction site, no drift.
  const targets: Record<string, DrillTarget> = {};
  const mk = (
    idx: number[] | undefined, title: string, subtitle?: string,
    focusDim?: string, focusVal?: string
  ): DrillTarget => {
    const t: DrillTarget = {
      ...makeTarget(
        orderIds, idx, title, subtitle,
        focusDim && focusVal ? { dim: focusDim as never, val: focusVal } : undefined
      ),
      key: `revenue:${title}`,
    };
    targets[t.key!] = t;
    return t;
  };
  const drillTo = (
    idx: number[] | undefined, title: string, subtitle?: string,
    focusDim?: string, focusVal?: string
  ) => setDrill(mk(idx, title, subtitle, focusDim, focusVal));

  // Register every drillable row each render so the open panel can be refreshed.
  mk(statsO?.all, "Total revenue", `${stats?.orderCount ?? 0} orders · ${fmtMoney((stats?.totalCents as number) ?? 0)}`);
  mk(statsO?.product, "Product revenue", fmtMoney((stats?.productCents as number) ?? 0));
  mk(statsO?.all, "All customers", `${stats?.uniqueCustomers ?? 0} unique buyers`);
  mk(statsO?.all, "All orders", `AOV ${fmtMoney((stats?.avgOrderCents as number) ?? 0)}`);
  (statusBreakdown ?? []).forEach((r) => mk(r.o, `Status: ${r.status}`, `${r.count} orders`, "status", r.status));
  (countryBreakdown ?? []).forEach((r) => mk(r.o, countryLabel(r.country), `${r.count} orders · ${fmtMoney(r.cents)}`, "country", r.country));
  (orderValueBuckets ?? []).forEach((b) => mk(b.o, `Order value ${b.label}`, `${b.count} orders`));
  (productBreakdown ?? []).forEach((p) => mk(p.o, p.name, `${p.units} units · ${fmtMoney(p.revenue)}`, "sku", p.name));
  (timeSeries ?? []).forEach((pt) => mk(pt.o, pt.date, `${pt.orders} orders · ${fmtMoney(pt.revenue)}`));

  useDrillSync({ target: drill, targets, namespace: "revenue:", onDrill: setDrill, dataToken: data });

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Excludes cancelled orders · USD</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3 mb-6">
        <AnalyticsFilters
          value={filters}
          onChange={setFilters}
          focus={focus}
          onClearFocus={() => setFocus(null)}
        />
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={loading ? "—" : fmtMoney((stats?.totalCents as number) ?? 0)}
          sub={loading ? undefined : `${stats?.orderCount ?? 0} orders`}
          delta={deltas?.revenue}
          count={statsO?.all?.length}
          onDrill={() => drillTo(statsO?.all, "Total revenue", `${stats?.orderCount ?? 0} orders · ${fmtMoney((stats?.totalCents as number) ?? 0)}`)}
        />
        <StatCard
          label="Product Revenue"
          value={loading ? "—" : fmtMoney((stats?.productCents as number) ?? 0)}
          sub={loading ? undefined : "Excl. event fees"}
          count={statsO?.product?.length}
          onDrill={() => drillTo(statsO?.product, "Product revenue", fmtMoney((stats?.productCents as number) ?? 0))}
        />
        <StatCard
          label="Unique Customers"
          value={loading ? "—" : String(stats?.uniqueCustomers ?? 0)}
          delta={deltas?.customers}
          count={statsO?.all?.length}
          onDrill={() => drillTo(statsO?.all, "All customers", `${stats?.uniqueCustomers ?? 0} unique buyers`)}
        />
        <StatCard
          label="Avg Order Value"
          value={loading ? "—" : fmtMoney((stats?.avgOrderCents as number) ?? 0)}
          delta={deltas?.avgOrder}
          count={statsO?.all?.length}
          onDrill={() => drillTo(statsO?.all, "All orders", `AOV ${fmtMoney((stats?.avgOrderCents as number) ?? 0)}`)}
        />
        <StatCard
          label="Avg Daily Revenue"
          value={loading ? "—" : fmtMoney(avgDailyCents)}
          sub={loading ? undefined : `over ${rangeDays} day${rangeDays !== 1 ? "s" : ""}`}
          count={statsO?.all?.length}
          onDrill={() => drillTo(statsO?.all, "All orders", `${fmtMoney(avgDailyCents)} / day over ${rangeDays} days`)}
        />
      </div>

      {/* ── Event revenue card ──────────────────────────────────────────────── */}
      {!loading && eventRevenue && (eventRevenue.tournamentCount + eventRevenue.openPlayCount) > 0 && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Event Revenue</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
            <div>
              <p className="text-2xl font-bold text-indigo-700">{fmtMoney(eventRevenue.totalCents)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total event</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{fmtMoney(eventRevenue.tournamentCents)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{eventRevenue.tournamentCount} tournament entries</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{fmtMoney(eventRevenue.openPlayCents)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{eventRevenue.openPlayCount} open play registrations</p>
            </div>
          </div>
          {eventRevenue.breakdown.length > 0 && (
            <div className="divide-y divide-gray-50 border-t border-gray-100 mt-2">
              {eventRevenue.breakdown.map((e) => (
                <DrillRow
                  key={e.name}
                  count={e.o?.length}
                  onDrill={() => drillTo(e.o, e.name, `${e.count} registrations · ${fmtMoney(e.cents)}`)}
                  className="flex items-center justify-between py-1.5 text-xs rounded-lg px-2 -mx-2"
                >
                  <span className="text-gray-700">{e.name}</span>
                  <span className="flex items-center gap-3 text-gray-500">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${
                      e.kind === "tournament" ? "bg-indigo-100 text-indigo-700" : "bg-teal-100 text-teal-700"
                    }`}>
                      {e.kind === "tournament" ? "Tournament" : "Open Play"}
                    </span>
                    {e.count}× · {fmtMoney(e.cents)}
                  </span>
                </DrillRow>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Expenses + Net Revenue ──────────────────────────────────────────── */}
      {!loading && (stripeFees || shippingCosts || netRevenue) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Expenses &amp; Net Revenue</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {stripeFees && stripeFees.totalCents > 0 && (
              <StatCard
                label="Stripe Fees" value={fmtMoney(stripeFees.totalCents)}
                sub={`${stripeFees.pctOfRevenue}% of revenue · avg ${fmtMoney(stripeFees.avgCents)}`}
                count={statsO?.withFee?.length}
                onDrill={() => drillTo(statsO?.withFee, "Orders with Stripe fees", `${stripeFees.ordersWithFee} orders · ${fmtMoney(stripeFees.totalCents)}`)}
              />
            )}
            {shippingCosts && shippingCosts.totalCents > 0 && (
              <StatCard
                label="Shipping Labels" value={fmtMoney(shippingCosts.totalCents)}
                sub={`${shippingCosts.pctOfRevenue}% of revenue · avg ${fmtMoney(shippingCosts.avgCents)}`}
                count={statsO?.withLabel?.length}
                onDrill={() => drillTo(statsO?.withLabel, "Orders with shipping labels", `${shippingCosts.ordersWithLabel} labels · ${fmtMoney(shippingCosts.totalCents)}`)}
              />
            )}
            {netRevenue && netRevenue.netCents > 0 && (
              <>
                <StatCard label="Total Deductions" value={fmtMoney(netRevenue.totalFeesCents)}  sub="Fees + shipping" />
                <StatCard label="Net Revenue"       value={fmtMoney(netRevenue.netCents)}        sub="After fees &amp; shipping" />
              </>
            )}
          </div>
          {netRevenue && netRevenue.productCents > 0 && (
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-700">{fmtMoney(netRevenue.productCents)}</span>
              <span>product revenue</span>
              {netRevenue.totalFeesCents > 0 && <>
                <span>−</span>
                <span className="font-medium text-red-600">{fmtMoney(netRevenue.totalFeesCents)}</span>
                <span>expenses</span>
                <span>=</span>
                <span className="font-medium text-green-700">{fmtMoney(netRevenue.netCents)}</span>
                <span>net</span>
              </>}
            </div>
          )}
        </div>
      )}

      {/* ── Domestic / International card ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 lg:col-span-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Domestic vs International</p>
          {loading ? (
            <div className="h-24 animate-pulse bg-gray-100 rounded-lg" />
          ) : (
            <div className="space-y-3">
              {[
                { label: "🇺🇸 Domestic (US)",  data: domData,  color: "bg-sky-500" },
                { label: "🌍 International",    data: intlData, color: "bg-violet-500" },
              ].map(({ label, data: d, color }) => {
                const pct = totalCents > 0 ? Math.round(((d?.cents ?? 0) / totalCents) * 100) : 0;
                return (
                  <DrillRow
                    key={label}
                    count={d?.o?.length}
                    onDrill={() => drillTo(d?.o, label, `${d?.count ?? 0} orders · ${fmtMoney(d?.cents ?? 0)}`)}
                    className="rounded-lg px-2 py-1.5 -mx-2"
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">{label}</span>
                      <span className="text-gray-500">{d?.count ?? 0} orders · {fmtMoney(d?.cents ?? 0)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </DrillRow>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {revMetric === "revenue" ? "Revenue Over Time" : "Avg Daily Revenue Over Time"}
            </p>
            {/* Per-day view divides each bucket by the days it covers inside the
                range, so a part-finished month compares fairly with a full one. */}
            <div className="flex gap-1">
              {([
                { v: "revenue",  label: "Total" },
                { v: "avgDaily", label: "Avg / day" },
              ] as const).map((m) => (
                <button
                  key={m.v}
                  onClick={() => setRevMetric(m.v)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    revMetric === m.v
                      ? "bg-sky-600 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-[220px] animate-pulse bg-gray-100 rounded-lg" />
          ) : timeSeries && timeSeries.length > 0 ? (
            <RevenueAreaChart
              data={timeSeries}
              granularity={granularity}
              metric={revMetric}
              onDrillDate={(d) => {
                const pt = timeSeries.find((x) => x.date === d);
                drillTo(pt?.o, d, `${pt?.orders ?? 0} orders · ${fmtMoney(pt?.revenue ?? 0)}`);
              }}
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">No data for this period.</p>
          )}
        </div>
      </div>

      {/* ── Orders over time ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Orders Over Time</p>
        {loading ? (
          <div className="h-[160px] animate-pulse bg-gray-100 rounded-lg" />
        ) : timeSeries && timeSeries.length > 0 ? (
          <OrdersBarChart
            data={timeSeries}
            onDrillDate={(d) => {
              const pt = timeSeries.find((x) => x.date === d);
              drillTo(pt?.o, d, `${pt?.orders ?? 0} orders`);
            }}
          />
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No data for this period.</p>
        )}
      </div>

      {/* ── 3-col row: status + buckets + countries ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Status breakdown */}
        <SectionCard title="Orders by Status">
          {loading ? (
            <div className="p-5 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-5 animate-pulse bg-gray-100 rounded" />)}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(statusBreakdown ?? []).map(({ status, count, pct, o }) => (
                <DrillRow
                  key={status}
                  count={o?.length}
                  onDrill={() => drillTo(o, `Status: ${status}`, `${count} orders`, "status", status)}
                  className="px-5 py-2.5 flex items-center gap-3"
                >
                  <span className="w-20 text-xs font-medium text-gray-700 capitalize">{status}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STATUS_COLORS[status] ?? "bg-gray-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{count} <span className="text-gray-300">({pct}%)</span></span>
                </DrillRow>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Order value distribution */}
        <SectionCard title="Order Value Distribution">
          {loading ? (
            <div className="p-5 h-[160px] animate-pulse bg-gray-100 rounded-lg" />
          ) : orderValueBuckets ? (
            <div className="px-4 py-3">
              <OrderValueBucketChart
                data={orderValueBuckets}
                onDrillBucket={(label) => {
                  const b = orderValueBuckets.find((x) => x.label === label);
                  drillTo(b?.o, `Order value ${label}`, `${b?.count ?? 0} orders`);
                }}
              />
            </div>
          ) : null}
        </SectionCard>

        {/* Country breakdown */}
        <SectionCard title="Top Countries">
          {loading ? (
            <div className="p-5 space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-5 animate-pulse bg-gray-100 rounded" />)}
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[220px] overflow-y-auto">
              {(countryBreakdown ?? []).slice(0, 15).map(({ country, cents, count, o }) => (
                <DrillRow
                  key={country}
                  count={o?.length}
                  onDrill={() => drillTo(o, countryLabel(country), `${count} orders · ${fmtMoney(cents)}`, "country", country)}
                  className="px-5 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-gray-700 font-medium truncate">
                    {countryLabel(country)}
                  </span>
                  <span className="text-gray-500 shrink-0">{count} · {fmtMoney(cents)}</span>
                </DrillRow>
              ))}
              {(countryBreakdown ?? []).length === 0 && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No data</p>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Products table ─────────────────────────────────────────────────── */}
      <SectionCard title="Products">
        {loading ? (
          <div className="p-5 space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-8 animate-pulse bg-gray-100 rounded" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Product", "Revenue", "% of Total", "Units Sold", "Rev / Unit"].map((h) => (
                    <th key={h} className={`px-5 py-3 font-medium text-gray-500 text-${h === "Product" ? "left" : "right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(productBreakdown ?? []).map((p, i) => (
                  <tr
                    key={p.name}
                    onClick={() => drillTo(p.o, p.name, `${p.units} units · ${fmtMoney(p.revenue)}`, "sku", p.name)}
                    title="View contributing orders"
                    className={`cursor-pointer transition-colors hover:bg-sky-50/60 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{fmtMoney(p.revenue)}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{p.pctOfTotal}%</td>
                    <td className="px-5 py-3 text-right text-gray-500">{p.units}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{fmtMoney((p as { revPerUnit?: number }).revPerUnit ?? 0)}</td>
                  </tr>
                ))}
                {(productBreakdown ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No product data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <DrillPanel
        target={drill}
        onClose={() => setDrill(null)}
        onApplyFocus={(f, label) => setFocus({ dim: f.dim, val: f.val, label })}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
