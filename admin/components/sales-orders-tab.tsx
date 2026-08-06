"use client";

import { useEffect, useState, useCallback } from "react";
import { analyticsParams, type AnalyticsFilterState, type FocusState } from "./analytics-filters";
import type { DrillTarget } from "./drill-panel";

function fmtMoney(cents: number | null) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  fulfilled:  "bg-green-100 text-green-800",
  cancelled:  "bg-gray-100 text-gray-600",
};

type OrderRow = {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  order_total_cents: number | null;
  order_currency: string;
  order_summary: string | null;
  fulfillment_status: string;
  created_at: string;
  shipping_address: Record<string, unknown> | null;
};

const PAGE_SIZE = 50;

type Props = {
  filters: AnalyticsFilterState;
  focus: FocusState | null;
  onDrill: (t: DrillTarget) => void;
  /** Accepted for a uniform tab signature; an order's own record doesn't
   *  change with the dashboard's date range, so there's nothing to refresh. */
  drill?: DrillTarget | null;
};

export default function SalesOrdersTab({ filters, focus, onDrill }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total,  setTotal]  = useState(0);
  const [page,   setPage]   = useState(0);
  const [loading, setLoading] = useState(true);

  // Local filters
  const [status, setStatus] = useState("");
  const [q,      setQ]      = useState("");
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");

  const load = useCallback(async (pg: number) => {
    setLoading(true);
    const params = analyticsParams(filters, focus);
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    if (minVal) params.set("min", minVal);
    if (maxVal) params.set("max", maxVal);
    params.set("page",  String(pg));
    params.set("limit", String(PAGE_SIZE));

    try {
      const res  = await fetch(`/api/admin/analytics/orders-list?${params}`);
      const json = await res.json();
      setOrders(json.orders ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filters, focus, status, q, minVal, maxVal]);

  useEffect(() => { setPage(0); void load(0); }, [filters, focus, status, minVal, maxVal, load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    void load(0);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Local filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All statuses</option>
              {["pending", "processing", "fulfilled", "cancelled"].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-500 mb-1">Search name / email / summary</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min ($)</label>
            <input
              type="number" min="0" value={minVal} onChange={(e) => setMinVal(e.target.value)}
              placeholder="0"
              className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max ($)</label>
            <input
              type="number" min="0" value={maxVal} onChange={(e) => setMaxVal(e.target.value)}
              placeholder="∞"
              className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {loading ? "Loading…" : `${total.toLocaleString()} orders`}
          </h2>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <button disabled={page === 0} onClick={() => { setPage(page - 1); void load(page - 1); }}
                className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">←</button>
              <span>Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => { setPage(page + 1); void load(page + 1); }}
                className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">→</button>
            </div>
          )}
        </div>
        {loading ? (
          <div className="p-6 space-y-2 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Date", "Customer", "Country", "Items", "Total", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o, i) => (
                  <tr
                    key={o.id}
                    onClick={() => onDrill({
                      key: `order:${o.id}`,
                      title: o.customer_name ?? o.customer_email ?? "Order",
                      orderIds: [o.id],
                      openOrderId: o.id,
                    })}
                    title="Open this order"
                    className={`cursor-pointer transition-colors hover:bg-sky-50/60 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900 truncate max-w-[140px]">{o.customer_name ?? "—"}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">{o.customer_email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {(o.shipping_address?.country as string) ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[180px] truncate">{o.order_summary ?? "—"}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">{fmtMoney(o.order_total_cents)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[o.fulfillment_status] ?? "bg-gray-100 text-gray-600"}`}>
                        {o.fulfillment_status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No orders match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
