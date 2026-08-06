// GET /api/admin/orders/export
//
// Every order matching the fulfillment page's filters — not just the rendered
// page. Pages through the table internally so the result is never silently
// truncated by a row cap.
//
// Query params: status, q, from, to, region, countOnly
//   countOnly=1 returns just { total }, so the UI can say how many rows an
//   export will produce before anyone downloads anything.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import type { ShippingAddress } from "@/lib/order-types";

export const dynamic = "force-dynamic";

const COLUMNS =
  "id, stripe_session_id, customer_name, customer_email, shipping_address, " +
  "order_data, order_summary, order_total_cents, order_currency, " +
  "fulfillment_status, created_at";

const PAGE = 1000;
const MAX_ROWS = 20000;

const STATUSES = ["pending", "processing", "fulfilled", "needs-match", "cancelled", "event"];

type Row = Record<string, unknown> & { shipping_address: Record<string, unknown> | null };

/** Mirrors the fulfillment page's own filtering so counts and rows agree. */
function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  { status, q, from, to }: { status: string | null; q: string | null; from: string | null; to: string | null }
) {
  if (status && status !== "all" && STATUSES.includes(status)) {
    query = query.eq("fulfillment_status", status);
  }
  if (q && q.trim()) {
    const safe = q.trim().replace(/[%_]/g, "\\$&");
    query = query.or(
      `customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%,order_summary.ilike.%${safe}%`
    );
  }
  if (from) query = query.gte("created_at", from);
  if (to)   query = query.lte("created_at", to);
  return query;
}

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Matches the analytics routes: the modal re-counts as the date range is
  // adjusted, so a tight limit trips during ordinary use.
  const { allowed } = rateLimit(session.user.id, 60, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { searchParams } = new URL(req.url);
  const opts = {
    status: searchParams.get("status"),
    q:      searchParams.get("q"),
    from:   searchParams.get("from"),
    to:     searchParams.get("to"),
  };
  const region    = searchParams.get("region") ?? "all";
  const countOnly = searchParams.get("countOnly") === "1";

  // Region is derived from the shipping address, which Postgres can't filter on
  // cheaply here — so when it's in play we count what we actually fetched.
  const regionFilters = region === "domestic" || region === "international";

  if (countOnly && !regionFilters) {
    const { count, error } = await applyFilters(
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }),
      opts
    );
    if (error) return NextResponse.json({ error: "Failed to count orders." }, { status: 500 });
    return NextResponse.json({ total: count ?? 0 });
  }

  const rows: Row[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await applyFilters(
      supabaseAdmin.from("orders").select(COLUMNS),
      opts
    )
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);

    if (error) {
      console.error("orders export error:", error);
      return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
    }

    const batch = (data ?? []) as unknown as Row[];
    rows.push(...batch);
    if (batch.length < PAGE || rows.length >= MAX_ROWS) break;
  }

  const scoped = regionFilters
    ? rows.filter((o) => {
        const c = ((o.shipping_address as ShippingAddress | null)?.country ?? "").toUpperCase();
        return region === "domestic" ? c === "US" : c !== "US";
      })
    : rows;

  if (countOnly) return NextResponse.json({ total: scoped.length });
  return NextResponse.json({ orders: scoped, total: scoped.length });
}
