// app/api/admin/orders/matchable/route.ts
// GET /api/admin/orders/matchable
// Returns non-cancelled orders from the last 90 days for tracking import matching.
// Protected: caller must be an authenticated admin user.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { allowed } = rateLimit(session.user.id, 120, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, customer_name, customer_email, created_at, tracking_number, " +
        "fulfillment_status, order_summary, order_total_cents, order_currency"
    )
    .neq("fulfillment_status", "cancelled")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Admin matchable orders fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
