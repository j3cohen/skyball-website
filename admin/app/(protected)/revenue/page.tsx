// app/(protected)/revenue/page.tsx
// Revenue dashboard — server component

import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import type { OrderData, OrderDataItem } from "@/lib/order-types";

function fmtMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

type OrderRow = {
  order_total_cents: number | null;
  order_currency: string;
  fulfillment_status: string;
  created_at: string;
  order_data: Record<string, unknown> | null;
};

export default async function RevenuePage() {
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("order_total_cents, order_currency, fulfillment_status, created_at, order_data")
    .neq("fulfillment_status", "cancelled");

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load orders: {error.message}</p>
      </div>
    );
  }

  const rows = (orders ?? []) as OrderRow[];

  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  // Revenue totals
  let totalCents = 0;
  let thisMonthCents = 0;
  let thisWeekCents = 0;

  // Status counts
  const statusCounts: Record<string, number> = {
    pending: 0,
    processing: 0,
    fulfilled: 0,
  };

  // Product aggregation: product_name → total_cents
  const productRevenue: Record<string, number> = {};
  const productOrders: Record<string, number> = {};

  for (const row of rows) {
    const cents = row.order_total_cents ?? 0;
    const createdAt = new Date(row.created_at);

    totalCents += cents;
    if (createdAt >= monthStart) thisMonthCents += cents;
    if (createdAt >= weekStart) thisWeekCents += cents;

    const status = row.fulfillment_status;
    if (status in statusCounts) statusCounts[status]++;

    // Parse order_data for product breakdown
    const orderData = row.order_data as OrderData | null;
    const items: OrderDataItem[] = orderData?.items ?? [];
    for (const item of items) {
      const name = item.product_name ?? "Unknown Product";
      const itemRevenue = item.amount_total_cents ?? 0;
      productRevenue[name] = (productRevenue[name] ?? 0) + itemRevenue;
      productOrders[name] = (productOrders[name] ?? 0) + (item.quantity ?? 1);
    }
  }

  const avgOrderCents = rows.length > 0 ? Math.round(totalCents / rows.length) : 0;

  // Top 5 products
  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const statCards = [
    { label: "Total Revenue", value: fmtMoney(totalCents), sub: `${rows.length} non-cancelled orders` },
    { label: "This Month", value: fmtMoney(thisMonthCents), sub: `Since ${monthStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}` },
    { label: "This Week", value: fmtMoney(thisWeekCents), sub: `Since ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` },
    { label: "Avg Order Value", value: fmtMoney(avgOrderCents), sub: "Across all orders" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Revenue</h1>
      <p className="text-sm text-gray-500 mb-8">
        Excludes cancelled orders. All amounts in USD.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Order status breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Orders by Status</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {Object.entries(statusCounts).map(([status, count]) => {
            const pct = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0;
            return (
              <div key={status} className="px-5 py-3 flex items-center gap-4">
                <span className="w-24 text-sm font-medium text-gray-700 capitalize">{status}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      status === "fulfilled"
                        ? "bg-green-500"
                        : status === "processing"
                        ? "bg-blue-500"
                        : "bg-yellow-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm text-gray-600">
                  {count} <span className="text-gray-400">({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top products table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Top 5 Products by Revenue</h2>
        </div>
        {topProducts.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No product data available.</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Product</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Revenue</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Units Sold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topProducts.map(([name, cents], i) => (
                <tr key={name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-5 py-3 font-medium text-gray-900">{name}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{fmtMoney(cents)}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{productOrders[name] ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
