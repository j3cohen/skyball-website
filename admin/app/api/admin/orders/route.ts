// app/api/admin/orders/route.ts
// GET  /api/admin/orders          — paginated list with optional status filter
// Protected: caller must be an authenticated admin user.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { allowed } = rateLimit(session.user.id, 120, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");       // pending|processing|fulfilled|cancelled
  const page   = Math.max(0, Number(searchParams.get("page") ?? 0));

  let query = supabaseAdmin
    .from("orders")
    .select(
      "id, stripe_session_id, customer_email, customer_name, customer_phone, " +
      "order_total_cents, order_currency, order_summary, fulfillment_status, " +
      "tracking_number, heard_about_us, created_at, fulfilled_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (status && ["pending", "processing", "fulfilled", "cancelled"].includes(status)) {
    query = query.eq("fulfillment_status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Admin orders fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE });
}
