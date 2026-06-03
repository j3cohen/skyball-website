"use client";

import { useEffect, useState } from "react";
import type { AnalyticsFilterState } from "./analytics-filters";

type Stats = {
  totalOrders: number;
  fulfilledCount: number;
  unfulfilledCount: number;
  avgDaysToFulfill: number | null;
  labelCostPct: number | null;
};
type AgeBucket = { label: string; count: number };
type StatusCounts = { pending: number; processing: number; fulfilled: number };
type Data = { stats: Stats; unfulfilledByAge: AgeBucket[]; statusCounts: StatusCounts };

export default function SalesFulfillmentTab({ filters }: { filters: AnalyticsFilterState }) {
  const [data,    setData]    = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

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

  const { stats, unfulfilledByAge, statusCounts } = data;
  const maxAge = Math.max(...unfulfilledByAge.map(b => b.count), 1);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Avg Days to Fulfill"
          value={stats.avgDaysToFulfill != null ? `${stats.avgDaysToFulfill}d` : "—"}
          sub="Fulfilled orders only"
        />
        <KpiCard
          label="Unfulfilled Orders"
          value={String(stats.unfulfilledCount)}
          sub={`${stats.totalOrders} total orders`}
          alert={stats.unfulfilledCount > 0}
        />
        <KpiCard
          label="Fulfillment Rate"
          value={stats.totalOrders > 0 ? `${Math.round((stats.fulfilledCount / stats.totalOrders) * 100)}%` : "—"}
          sub={`${stats.fulfilledCount} of ${stats.totalOrders}`}
        />
        <KpiCard
          label="Shipping Cost % of Revenue"
          value={stats.labelCostPct != null ? `${stats.labelCostPct}%` : "—"}
          sub="Label cost vs order value"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Unfulfilled by age */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Unfulfilled Orders by Age
          </p>
          {unfulfilledByAge.every(b => b.count === 0) ? (
            <p className="text-sm text-gray-400 py-6 text-center">All orders fulfilled. 🎉</p>
          ) : (
            <div className="space-y-3">
              {unfulfilledByAge.map(({ label, count }) => {
                const isLate = label.includes("15+") || label.includes("8–");
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{label}</span>
                      <span className={`font-semibold ${isLate && count > 0 ? "text-red-600" : "text-gray-500"}`}>
                        {count} orders
                      </span>
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

        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Order Status Breakdown
          </p>
          <div className="space-y-3">
            {(
              [
                { key: "fulfilled",  label: "Fulfilled",   color: "bg-green-500" },
                { key: "processing", label: "Processing",  color: "bg-blue-500"  },
                { key: "pending",    label: "Pending",     color: "bg-yellow-400" },
              ] as const
            ).map(({ key, label, color }) => {
              const count = statusCounts[key] ?? 0;
              const pct = stats.totalOrders > 0 ? Math.round((count / stats.totalOrders) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="text-gray-500">{count} orders ({pct}%)</span>
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
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-48 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
