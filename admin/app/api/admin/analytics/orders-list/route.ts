// GET /api/admin/analytics/orders-list
// Filterable, paginated order list for the Sales > Orders tab.
// Query params: from, to, region, status, q (search), min, max, page, limit

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { allowed } = rateLimit(session.user.id, 120, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const from    = searchParams.get("from");
  const to      = searchParams.get("to");
  const region  = searchParams.get("region") ?? "all";
  const status  = searchParams.get("status");
  const q       = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const min     = searchParams.get("min") ? Number(searchParams.get("min")) * 100 : null;
  const max     = searchParams.get("max") ? Number(searchParams.get("max")) * 100 : null;
  const page    = Math.max(0, Number(searchParams.get("page") ?? 0));
  const limit   = Math.min(100, Math.max(10, Number(searchParams.get("limit") ?? 50)));

  let query = supabaseAdmin
    .from("orders")
    .select(
      "id, stripe_session_id, customer_email, customer_name, order_total_cents, " +
      "order_currency, order_summary, fulfillment_status, created_at, fulfilled_at, " +
      "shipping_address, tracking_numbers"
    )
    .order("created_at", { ascending: false });

  if (status && ["pending", "processing", "fulfilled", "cancelled"].includes(status)) {
    query = query.eq("fulfillment_status", status);
  }
  if (from)  query = query.gte("created_at", from);
  if (to)    query = query.lte("created_at", to);
  if (min != null) query = query.gte("order_total_cents", min);
  if (max != null) query = query.lte("order_total_cents", max);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });

  let rows = (data ?? []) as unknown as {
    id: string;
    stripe_session_id: string;
    customer_email: string | null;
    customer_name: string | null;
    order_total_cents: number | null;
    order_currency: string;
    order_summary: string | null;
    fulfillment_status: string;
    created_at: string;
    fulfilled_at: string | null;
    shipping_address: Record<string, unknown> | null;
    tracking_numbers: unknown;
  }[];

  // JS-side region filter (JSONB field)
  if (region !== "all") {
    rows = rows.filter((o) => {
      const country = ((o.shipping_address?.country as string) ?? "").toUpperCase();
      if (region === "domestic") return country === "US";
      if (region === "international") return country !== "US";
      return country === region.toUpperCase();
    });
  }

  // JS-side text search
  if (q) {
    rows = rows.filter(
      (o) =>
        o.customer_email?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.order_summary?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
    );
  }

  const total = rows.length;
  const paged = rows.slice(page * limit, (page + 1) * limit);

  return NextResponse.json({ orders: paged, total, page, limit });
}
