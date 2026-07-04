// POST /api/admin/orders/mark-events
// Finds all non-cancelled, non-event orders whose order_summary matches
// tournament/open-play patterns and sets fulfillment_status = "event".
// Safe to run multiple times — only touches orders not already set to "event".

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

const EVENT_PATTERN = /entry.?fee|open.?play|tournament.?entry|tournament.?pass/i;

export async function POST() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Fetch all orders that are pending/processing (not already event/fulfilled/cancelled)
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_summary, fulfillment_status")
    .not("fulfillment_status", "in", '("event","fulfilled","cancelled")');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const eventIds = (orders ?? [])
    .filter(o => EVENT_PATTERN.test(o.order_summary ?? ""))
    .map(o => o.id);

  if (eventIds.length === 0) {
    return NextResponse.json({ updated: 0, message: "No event orders found to update." });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("orders")
    .update({ fulfillment_status: "event" })
    .in("id", eventIds);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ updated: eventIds.length });
}
