// app/(protected)/fulfillment/page.tsx
// Orders dashboard — server-rendered; search + pagination are URL-driven.

import Link                from "next/link";
import { supabaseAdmin }   from "@/lib/server/supabaseAdmin";
import FulfillmentTable    from "@/components/fulfillment-table";
import type { ExportableOrder } from "@/lib/order-types";

const STATUSES = ["all", "pending", "processing", "fulfilled", "needs-match", "cancelled"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  all:           "All",
  pending:       "Pending",
  processing:    "Processing",
  fulfilled:     "Fulfilled",
  "needs-match": "Needs Match",
  cancelled:     "Cancelled",
};

const PAGE_SIZE = 50;

async function fetchOrders(status: StatusFilter, q: string, page: number) {
  const from = page * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from("orders")
    .select(
      "id, stripe_session_id, customer_name, customer_email, shipping_address, " +
      "order_data, order_summary, order_total_cents, order_currency, " +
      "fulfillment_status, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") query = query.eq("fulfillment_status", status);

  if (q.trim()) {
    const safe = q.trim().replace(/[%_]/g, "\\$&");
    query = query.or(
      `customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%,order_summary.ilike.%${safe}%`
    );
  }

  return query;
}

async function fetchCounts() {
  const statuses = ["pending", "processing", "fulfilled", "needs-match", "cancelled"] as const;
  const results = await Promise.all(
    statuses.map(s =>
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
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const rawStatus = searchParams.status ?? "all";
  const status: StatusFilter = (STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as StatusFilter)
    : "all";
  const q    = searchParams.q ?? "";
  const page = Math.max(0, parseInt(searchParams.page ?? "0", 10) || 0);

  const [{ data, count }, counts] = await Promise.all([
    fetchOrders(status, q, page),
    fetchCounts(),
  ]);

  const orders    = (data ?? []) as unknown as ExportableOrder[];
  const total     = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fulfillment</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and ship customer orders</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {STATUSES.map(s => {
          const href = s === "all" ? "/fulfillment" : `/fulfillment?status=${s}`;
          return (
            <Link
              key={s}
              href={href}
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
          );
        })}
      </div>

      {/* Interactive table */}
      <FulfillmentTable
        orders={orders}
        total={total}
        currentPage={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        currentSearch={q}
        currentStatus={status}
      />
    </div>
  );
}
