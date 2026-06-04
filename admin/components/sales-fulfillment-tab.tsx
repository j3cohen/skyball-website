"use client";

import { useEffect, useState } from "react";
import type { AnalyticsFilterState } from "./analytics-filters";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom",
  AU: "Australia", DE: "Germany", FR: "France", JP: "Japan",
  MX: "Mexico", BR: "Brazil", IN: "India", NL: "Netherlands",
};

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
};
type AgeBucket     = { label: string; count: number };
type StatusCounts  = { pending: number; processing: number; fulfilled: number };
type CarrierRow    = { carrier: string; shippingCents: number; count: number; avgCents: number };
type CountryRow    = { country: string; shippingCents: number; count: number; avgCents: number; revCents: number };
type StateRow      = { state: string; shippingCents: number; count: number; avgCents: number };
type Data = {
  stats: Stats;
  unfulfilledByAge: AgeBucket[];
  statusCounts: StatusCounts;
  byCarrier: CarrierRow[];
  byCountry: CountryRow[];
  byState: StateRow[];
};

export default function SalesFulfillmentTab({ filters }: { filters: AnalyticsFilterState }) {
  const [data,    setData]    = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [stateExpanded, setStateExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to)   params.set("to",   filters.to);
    if (filters.region !== "all") params.set("region", filters.region);

    fetch(`/api/admin/analytics/fulfillment?${params}`)
      .then((r) => r.json())
      .then((json) => { setData(json); setError(null); })
      .catch(() => setError("Failed to load fulfillment data."))
      .finally(() => setLoading(false));
  }, [filters]);

  if (loading) return <LoadingSkeleton />;
  if (error)   return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!data)   return null;

  const { stats, unfulfilledByAge, statusCounts, byCarrier, byCountry, byState } = data;
  const maxAge = Math.max(...unfulfilledByAge.map((b) => b.count), 1);
  const maxCarrierCost = Math.max(...byCarrier.map((r) => r.shippingCents), 1);
  const maxCountryCost = Math.max(...byCountry.map((r) => r.shippingCents), 1);
  const maxStateAvg    = Math.max(...byState.map((r) => r.avgCents), 1);
  const displayedStates = stateExpanded ? byState : byState.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Avg Days to Fulfill" value={stats.avgDaysToFulfill != null ? `${stats.avgDaysToFulfill}d` : "—"} sub="Fulfilled orders only" />
        <KpiCard label="Unfulfilled Orders"  value={String(stats.unfulfilledCount)} sub={`${stats.totalOrders} total`} alert={stats.unfulfilledCount > 0} />
        <KpiCard label="Total Shipping Cost" value={fmtMoney(stats.totalShippingCents)} sub={`${stats.labeledOrders} labeled orders · avg ${fmtMoney(stats.avgShippingCents)}`} />
        {stats.totalFeeCents > 0 ? (
          <KpiCard label="Total Stripe Fees" value={fmtMoney(stats.totalFeeCents)} sub={`${stats.ordersWithFee} orders · avg ${fmtMoney(stats.avgFeeCents)}`} />
        ) : (
          <KpiCard label="Avg Shipping / Order" value={fmtMoney(stats.avgShippingCents)} sub={stats.shippingPctOfRev != null ? `${stats.shippingPctOfRev}% of revenue` : undefined} />
        )}
      </div>

      {/* Unfulfilled + status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Unfulfilled Orders by Age</p>
          {unfulfilledByAge.every((b) => b.count === 0) ? (
            <p className="text-sm text-gray-400 py-6 text-center">All orders fulfilled. 🎉</p>
          ) : (
            <div className="space-y-3">
              {unfulfilledByAge.map(({ label, count }) => {
                const isLate = label.includes("15+") || label.includes("8–");
                return (
                  <div key={label}>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Order Status Breakdown</p>
          <div className="space-y-3">
            {(
              [
                { key: "fulfilled",  label: "Fulfilled",  color: "bg-green-500"  },
                { key: "processing", label: "Processing", color: "bg-blue-500"   },
                { key: "pending",    label: "Pending",    color: "bg-yellow-400" },
              ] as const
            ).map(({ key, label, color }) => {
              const count = statusCounts[key] ?? 0;
              const pct = stats.totalOrders > 0 ? Math.round((count / stats.totalOrders) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shipping by carrier */}
      {byCarrier.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Shipping Cost by Carrier</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {byCarrier.map((r) => (
              <div key={r.carrier} className="px-5 py-2.5 flex items-center gap-4">
                <span className="w-20 text-sm font-medium text-gray-700">{r.carrier}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${Math.round((r.shippingCents / maxCarrierCost) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-14 text-right">{r.count} labels</span>
                <span className="text-sm font-medium text-gray-800 w-20 text-right">{fmtMoney(r.shippingCents)}</span>
                <span className="text-xs text-gray-400 w-20 text-right">avg {fmtMoney(r.avgCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipping by country */}
      {byCountry.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Shipping Cost by Country</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {byCountry.filter(r => r.count > 0).map((r) => (
              <div key={r.country} className="px-5 py-2.5 flex items-center gap-4">
                <span className="w-36 text-sm font-medium text-gray-700 truncate">
                  {COUNTRY_NAMES[r.country] ?? r.country}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-400"
                    style={{ width: `${Math.round((r.shippingCents / maxCountryCost) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{r.count} orders</span>
                <span className="text-sm font-medium text-gray-800 w-20 text-right">{fmtMoney(r.shippingCents)}</span>
                <span className="text-xs text-gray-400 w-20 text-right">avg {fmtMoney(r.avgCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipping by US state (avg cost) */}
      {byState.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Avg Shipping Cost by State (US)</h2>
            <span className="text-xs text-gray-400">{byState.length} states</span>
          </div>
          <div className="divide-y divide-gray-50">
            {displayedStates.map((r) => (
              <div key={r.state} className="px-5 py-2 flex items-center gap-4">
                <span className="w-12 text-sm font-medium text-gray-700">{r.state}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-400"
                    style={{ width: `${Math.round((r.avgCents / maxStateAvg) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{r.count} orders</span>
                <span className="text-sm font-medium text-gray-800 w-20 text-right">avg {fmtMoney(r.avgCents)}</span>
              </div>
            ))}
          </div>
          {byState.length > 10 && (
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                onClick={() => setStateExpanded((v) => !v)}
                className="text-xs text-sky-600 hover:underline"
              >
                {stateExpanded ? "Show less" : `Show all ${byState.length} states`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm px-5 py-4 ${alert ? "border-amber-300" : "border-gray-200"}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${alert ? "text-amber-600" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-48 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-48 bg-gray-100 rounded-xl" />
    </div>
  );
}
