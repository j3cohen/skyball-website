// app/(protected)/fulfillment/page.tsx
// Orders dashboard — server-rendered, filter by status via ?status= query param.

import Link               from "next/link";
import { supabaseAdmin }  from "@/lib/server/supabaseAdmin";

const STATUSES = ["all", "pending", "processing", "fulfilled", "cancelled"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  all:        "All",
  pending:    "Pending",
  processing: "Processing",
  fulfilled:  "Fulfilled",
  cancelled:  "Cancelled",
};

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  fulfilled:  "bg-green-100 text-green-800",
  cancelled:  "bg-gray-100 text-gray-600",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtMoney(cents: number | null, currency: string) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(),
  }).format(cents / 100);
}

async function fetchOrders(status: StatusFilter) {
  let q = supabaseAdmin
    .from("orders")
    .select(
      "id, stripe_session_id, customer_name, customer_email, order_summary, " +
      "order_total_cents, order_currency, fulfillment_status, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") q = q.eq("fulfillment_status", status);
  return q;
}

async function fetchCounts() {
  const statuses = ["pending", "processing", "fulfilled", "cancelled"] as const;
  const results = await Promise.all(
    statuses.map((s) =>
      supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("fulfillment_status", s)
    )
  );
  const counts: Record<string, number> = { all: 0 };
  statuses.forEach((s, i) => {
    counts[s] = results[i].count ?? 0;
    counts.all += counts[s];
  });
  return counts;
}

export default async function FulfillmentPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const rawStatus = searchParams.status ?? "all";
  const status: StatusFilter = (STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : "all";

  const [{ data: orders }, counts] = await Promise.all([
    fetchOrders(status),
    fetchCounts(),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fulfillment</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and ship customer orders</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/fulfillment" : `/fulfillment?status=${s}`}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors
              ${status === s
                ? "border-b-2 border-sky-600 text-sky-700 bg-white"
                : "text-gray-500 hover:text-gray-700"}`}
          >
            {STATUS_LABELS[s]}
            {counts[s] > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium
                ${s === status ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-500"}`}>
                {counts[s]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Orders table */}
      {!orders || orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No orders found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Items</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {fmtDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{order.customer_name ?? "—"}</div>
                    <div className="text-xs text-gray-400">{order.customer_email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-gray-600 text-xs line-clamp-2">
                      {order.order_summary ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                    {fmtMoney(order.order_total_cents, order.order_currency)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${STATUS_BADGE[order.fulfillment_status] ?? "bg-gray-100 text-gray-600"}`}>
                      {order.fulfillment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/fulfillment/${order.id}`}
                      className="text-sky-600 hover:text-sky-800 font-medium text-xs"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
