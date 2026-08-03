// POST /api/admin/orders/by-ids
// Batch-fetch full order records for the drill-down panel.
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

  const ids = (body as { ids?: unknown })?.ids;
  if (!Array.isArray(ids) || ids.some((v) => typeof v !== "string")) {
    return NextResponse.json({ error: "ids must be an array of strings." }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ orders: [] });
  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Too many ids — ${MAX_IDS} max.` },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, stripe_session_id, customer_name, customer_email, customer_phone, " +
      "shipping_address, order_data, order_summary, order_total_cents, order_currency, " +
      "fulfillment_status, tracking_number, tracking_numbers, internal_notes, " +
      "shipping_label_cost, stripe_fee_cents, refund_amount_cents, refund_status, " +
      "created_at, fulfilled_at"
    )
    .in("id", ids as string[])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("by-ids fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
