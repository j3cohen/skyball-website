"use client";

import { useEffect, useState } from "react";
import { analyticsParams, type AnalyticsFilterState, type FocusState } from "./analytics-filters";
import DrillRow from "./drill-row";
import { makeTarget, type DrillTarget } from "./drill-panel";
import { useDrillSync } from "@/lib/use-drill-sync";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom",
  AU: "Australia", DE: "Germany", FR: "France", JP: "Japan",
  MX: "Mexico", BR: "Brazil", IN: "India", NL: "Netherlands",
};

/** "Unknown" is the bucket for orders with no shipping address at all. */
function countryLabel(code: string): string {
  if (!code || code.toUpperCase() === "UNKNOWN") return "Unknown / no address";
  return COUNTRY_NAMES[code] ?? code;
}

type Idx = number[];
type Stats = {
  totalOrders: number;
  fulfilledCount: number;
  unfulfilledCount: number;
  avgDaysToFulfill: number | null;
  totalShippingCents: number;
  avgShippingCents: number;
  shippingPctOfRev: number | null;
  labeledOrders: number;
  totalFeeCents: number;
  avgFeeCents: number;
  ordersWithFee: number;
  o: {
    totalOrders: Idx; fulfilled: Idx; unfulfilled: Idx; labeled: Idx; withFees: Idx;
  };
};
type AgeBucket    = { label: string; count: number; o: Idx };
type StatusEntry  = { count: number; o: Idx };
type CarrierRow   = { carrier: string; shippingCents: number; count: number; avgCents: number; o: Idx };
type CountryRow   = { country: string; shippingCents: number; count: number; avgCents: number; revCents: number; o: Idx };
type StateRow     = { state: string; shippingCents: number; count: number; avgCents: number; o: Idx };
type Data = {
  stats: Stats;
  unfulfilledByAge: AgeBucket[];
  statusCounts: Record<"pending" | "processing" | "fulfilled", StatusEntry>;
  byCarrier: CarrierRow[];
  byCountry: CountryRow[];
  byState: StateRow[];
  orderIds: string[];
};

type Props = {
  filters: AnalyticsFilterState;
  focus: FocusState | null;
  onDrill: (t: DrillTarget) => void;
  /** The currently open drill, so it can be refreshed when data reloads. */
  drill: DrillTarget | null;
};

const NS = "fulfillment:";

export default function SalesFulfillmentTab({ filters, focus, onDrill, drill }: Props) {
  const [data,    setData]    = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [stateExpanded, setStateExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/fulfillment?${analyticsParams(filters, focus)}`)
      .then((r) => r.json())
      .then((json) => { setData(json); setError(null); })
      .catch(() => setError("Failed to load fulfillment data."))
      .finally(() => setLoading(false));
  }, [filters, focus]);

  if (loading) return <LoadingSkeleton />;
  if (error)   return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!data)   return null;

  const { stats, unfulfilledByAge, statusCounts, byCarrier, byCountry, byState, orderIds } = data;
  const maxAge = Math.max(...unfulfilledByAge.map((b) => b.count), 1);
  const maxCarrierCost = Math.max(...byCarrier.map((r) => r.shippingCents), 1);
  const maxCountryCost = Math.max(...byCountry.map((r) => r.shippingCents), 1);
  const maxStateAvg    = Math.max(...byState.map((r) => r.avgCents), 1);
  const displayedStates = stateExpanded ? byState : byState.slice(0, 10);

  // Single construction site for every drill target on this tab. The click
  // handlers and the refresh-on-reload both read from here, so they can't drift.
  const targets: Record<string, DrillTarget> = {};
  const add = (
    key: string, idx: Idx, title: string, subtitle?: string,
    focusDim?: string, focusVal?: string
  ) => {
    targets[NS + key] = {
      ...makeTarget(
        orderIds, idx, title, subtitle,
        focusDim && focusVal ? { dim: focusDim as never, val: focusVal } : undefined
      ),
      key: NS + key,
    };
  };
  const open = (key: string) => { const t = targets[NS + key]; if (t) onDrill(t); };

  add("kpi:fulfilled",   stats.o.fulfilled,   "Fulfilled orders",              `${stats.fulfilledCount} orders`);
  add("kpi:unfulfilled", stats.o.unfulfilled, "Unfulfilled orders",            `${stats.unfulfilledCount} orders`);
  add("kpi:labeled",     stats.o.labeled,     "Orders with shipping labels",   `${stats.labeledOrders} labels · ${fmtMoney(stats.totalShippingCents)}`);
  add("kpi:withFees",    stats.o.withFees,    "Orders with Stripe fees",       `${stats.ordersWithFee} orders · ${fmtMoney(stats.totalFeeCents)}`);
  for (const b of unfulfilledByAge) add(`age:${b.label}`, b.o, `Unfulfilled: ${b.label}`, `${b.count} orders`, "ageBucket", b.label);
  for (const [k, v] of Object.entries(statusCounts)) add(`status:${k}`, v.o, `Status: ${k}`, `${v.count} orders`, "status", k);
  for (const r of byCarrier) add(`carrier:${r.carrier}`, r.o, `Carrier: ${r.carrier}`, `${r.count} labels · ${fmtMoney(r.shippingCents)}`, "carrier", r.carrier);
  for (const r of byCountry) add(`country:${r.country}`, r.o, `Country: ${countryLabel(r.country)}`, `${r.o.length} orders · ${fmtMoney(r.shippingCents)} shipping`, "country", r.country);
  for (const r of byState) add(`state:${r.state}`, r.o, `State: ${r.state}`, `${r.count} orders · avg ${fmtMoney(r.avgCents)}`, "state", r.state);

  return (
    <div className="space-y-6">
      <DrillSync target={drill} targets={targets} onDrill={onDrill} token={data} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Avg Days to Fulfill"
          value={stats.avgDaysToFulfill != null ? `${stats.avgDaysToFulfill}d` : "—"}
          sub="Fulfilled orders only"
          onDrill={() => open("kpi:fulfilled")}
          count={stats.fulfilledCount}
        />
        <KpiCard
          label="Unfulfilled Orders"
          value={String(stats.unfulfilledCount)}
          sub={`${stats.totalOrders} total`}
          alert={stats.unfulfilledCount > 0}
          onDrill={() => open("kpi:unfulfilled")}
          count={stats.unfulfilledCount}
        />
        <KpiCard
          label="Total Shipping Cost"
          value={fmtMoney(stats.totalShippingCents)}
          sub={`${stats.labeledOrders} labeled orders · avg ${fmtMoney(stats.avgShippingCents)}`}
          onDrill={() => open("kpi:labeled")}
          count={stats.labeledOrders}
        />
        {stats.totalFeeCents > 0 ? (
          <KpiCard
            label="Total Stripe Fees"
            value={fmtMoney(stats.totalFeeCents)}
            sub={`${stats.ordersWithFee} orders · avg ${fmtMoney(stats.avgFeeCents)}`}
            onDrill={() => open("kpi:withFees")}
            count={stats.ordersWithFee}
          />
        ) : (
          <KpiCard
            label="Avg Shipping / Order"
            value={fmtMoney(stats.avgShippingCents)}
            sub={stats.shippingPctOfRev != null ? `${stats.shippingPctOfRev}% of revenue` : undefined}
            onDrill={() => open("kpi:labeled")}
            count={stats.labeledOrders}
          />
        )}
      </div>

      {/* Unfulfilled + status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Unfulfilled Orders by Age">
          {unfulfilledByAge.every((b) => b.count === 0) ? (
            <p className="text-sm text-gray-400 py-6 text-center">All orders fulfilled. 🎉</p>
          ) : (
            <div className="space-y-1">
              {unfulfilledByAge.map(({ label, count }) => {
                const isLate = label.includes("15+") || label.includes("8–");
                return (
                  <DrillRow
                    key={label}
                    count={count}
                    onDrill={() => open(`age:${label}`)}
                    className="rounded-lg px-2 py-1.5 -mx-2"
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className={`font-semibold ${isLate && count > 0 ? "text-red-600" : "text-gray-500"}`}>{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isLate && count > 0 ? "bg-red-400" : "bg-amber-400"}`}
                        style={{ width: `${Math.round((count / maxAge) * 100)}%` }}
                      />
                    </div>
                  </DrillRow>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Order Status Breakdown">
          <div className="space-y-1">
            {(
              [
                { key: "fulfilled",  label: "Fulfilled",  color: "bg-green-500"  },
                { key: "processing", label: "Processing", color: "bg-blue-500"   },
                { key: "pending",    label: "Pending",    color: "bg-yellow-400" },
              ] as const
            ).map(({ key, label, color }) => {
              const entry = statusCounts[key] ?? { count: 0, o: [] };
              const pct = stats.totalOrders > 0 ? Math.round((entry.count / stats.totalOrders) * 100) : 0;
              return (
                <DrillRow
                  key={key}
                  count={entry.count}
                  onDrill={() => open(`status:${key}`)}
                  className="rounded-lg px-2 py-1.5 -mx-2"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="text-gray-500">{entry.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </DrillRow>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Shipping by carrier */}
      {byCarrier.length > 0 && (
        <TableCard title="Shipping Cost by Carrier">
          {byCarrier.map((r) => (
            <DrillRow
              key={r.carrier}
              count={r.count}
              onDrill={() => open(`carrier:${r.carrier}`)}
              className="px-5 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:flex-nowrap">
                <span className="w-20 text-sm font-medium text-gray-700">{r.carrier}</span>
                <div className="basis-full order-last sm:basis-auto sm:order-none sm:flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${Math.round((r.shippingCents / maxCarrierCost) * 100)}%` }}
                  />
                </div>
                <span className="ml-auto sm:ml-0 text-xs text-gray-500 sm:w-14 text-right">{r.count} labels</span>
                <span className="text-sm font-medium text-gray-800 sm:w-20 text-right">{fmtMoney(r.shippingCents)}</span>
                <span className="text-xs text-gray-400 sm:w-20 text-right">avg {fmtMoney(r.avgCents)}</span>
              </div>
            </DrillRow>
          ))}
        </TableCard>
      )}

      {/* Shipping by country */}
      {byCountry.length > 0 && (
        <TableCard title="Shipping Cost by Country">
          {byCountry.filter(r => r.o.length > 0).map((r) => (
            <DrillRow
              key={r.country}
              count={r.o.length}
              onDrill={() => open(`country:${r.country}`)}
              className="px-5 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:flex-nowrap">
                <span className="sm:w-36 text-sm font-medium text-gray-700 truncate">
                  {countryLabel(r.country)}
                </span>
                <div className="basis-full order-last sm:basis-auto sm:order-none sm:flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-400"
                    style={{ width: `${Math.round((r.shippingCents / maxCountryCost) * 100)}%` }}
                  />
                </div>
                <span className="ml-auto sm:ml-0 text-xs text-gray-500 sm:w-16 text-right">{r.o.length} orders</span>
                <span className="text-sm font-medium text-gray-800 sm:w-20 text-right">{fmtMoney(r.shippingCents)}</span>
                <span className="text-xs text-gray-400 sm:w-20 text-right">avg {fmtMoney(r.avgCents)}</span>
              </div>
            </DrillRow>
          ))}
        </TableCard>
      )}

      {/* Shipping by US state (avg cost) */}
      {byState.length > 0 && (
        <TableCard
          title="Avg Shipping Cost by State (US)"
          action={<span className="text-xs text-gray-400">{byState.length} states</span>}
          footer={byState.length > 10 ? (
            <button
              onClick={() => setStateExpanded((v) => !v)}
              className="text-xs text-sky-600 hover:underline"
            >
              {stateExpanded ? "Show less" : `Show all ${byState.length} states`}
            </button>
          ) : undefined}
        >
          {displayedStates.map((r) => (
            <DrillRow
              key={r.state}
              count={r.count}
              onDrill={() => open(`state:${r.state}`)}
              className="px-5 py-2"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:flex-nowrap">
                <span className="w-12 text-sm font-medium text-gray-700">{r.state}</span>
                <div className="basis-full order-last sm:basis-auto sm:order-none sm:flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-400"
                    style={{ width: `${Math.round((r.avgCents / maxStateAvg) * 100)}%` }}
                  />
                </div>
                <span className="ml-auto sm:ml-0 text-xs text-gray-500 sm:w-16 text-right">{r.count} orders</span>
                <span className="text-sm font-medium text-gray-800 sm:w-20 text-right">avg {fmtMoney(r.avgCents)}</span>
              </div>
            </DrillRow>
          ))}
        </TableCard>
      )}
    </div>
  );
}

/** Hooks can't run after the early returns above, so the sync lives in a child. */
function DrillSync({
  target, targets, onDrill, token,
}: {
  target: DrillTarget | null;
  targets: Record<string, DrillTarget>;
  onDrill: (t: DrillTarget) => void;
  token: unknown;
}) {
  useDrillSync({ target, targets, namespace: NS, onDrill, dataToken: token });
  return null;
}

// ── Card chrome ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</p>
      {children}
    </div>
  );
}

function TableCard({
  title, children, action, footer,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {action}
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-gray-100">{footer}</div>}
    </div>
  );
}

function KpiCard({
  label, value, sub, alert, onDrill, count,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  onDrill?: () => void;
  count?: number;
}) {
  return (
    <DrillRow
      onDrill={onDrill}
      count={count}
      className={`block bg-white rounded-xl border shadow-sm px-5 py-4 ${alert ? "border-amber-300" : "border-gray-200"}`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${alert ? "text-amber-600" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </DrillRow>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-48 bg-gray-100 rounded-xl" />
    </div>
  );
}
