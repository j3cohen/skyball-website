// POST /api/admin/orders/by-ids
// Batch-fetch full order records for the drill-down panel.
//
// Accepts either `{ ids }` — the orders behind a metric — or `{ email }`, which
// returns that customer's complete order history. The email form matters
// because a customer reached by drilling into one metric should still show
// their real lifetime totals, not just the orders that metric happened to
// include.
//
// POST rather than GET because a drilled metric can reference hundreds of
// orders and a URL full of UUIDs would blow past length limits.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

const MAX_IDS = 2000;

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { allowed } = rateLimit(session.user.id, 120, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { ids, email } = (body ?? {}) as { ids?: unknown; email?: unknown };

  const COLUMNS =
    "id, stripe_session_id, customer_name, customer_email, customer_phone, " +
    "shipping_address, order_data, order_summary, order_total_cents, order_currency, " +
    "fulfillment_status, tracking_number, tracking_numbers, internal_notes, " +
    "shipping_label_cost, stripe_fee_cents, refund_amount_cents, refund_status, " +
    "created_at, fulfilled_at";

  let query = supabaseAdmin.from("orders").select(COLUMNS);

  if (typeof email === "string" && email.trim()) {
    // Cancelled orders stay out so lifetime totals match the dashboard's.
    query = query.ilike("customer_email", email.trim()).neq("fulfillment_status", "cancelled");
  } else {
    if (!Array.isArray(ids) || ids.some((v) => typeof v !== "string")) {
      return NextResponse.json({ error: "Provide ids (string[]) or email." }, { status: 400 });
    }
    if (ids.length === 0) return NextResponse.json({ orders: [] });
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `Too many ids — ${MAX_IDS} max.` }, { status: 400 });
    }
    query = query.in("id", ids as string[]);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("by-ids fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
