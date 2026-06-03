// GET /api/admin/orders/matchable-stripe
// Returns all non-cancelled orders with Stripe IDs and refund fields
// for use by the Stripe import modal matching logic.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { allowed } = rateLimit(session.user.id, 60, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, customer_name, customer_email, created_at, order_total_cents, order_currency, " +
      "order_summary, fulfillment_status, stripe_payment_intent_id, stripe_session_id, " +
      "refund_amount_cents, refund_status, stripe_fee_cents"
    )
    .neq("fulfillment_status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("matchable-stripe fetch error:", error);
    return NextResponse.json({ error: "Failed to load orders." }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
