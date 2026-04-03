// app/api/admin/orders/[id]/route.ts
// GET   /api/admin/orders/:id  — full order record including order_data
// PATCH /api/admin/orders/:id  — update fulfillment_status / tracking_number / internal_notes
// Protected: caller must be an authenticated admin user.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { allowed } = rateLimit(session.user.id, 120, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ order: data });
}

// ── PATCH ──────────────────────────────────────────────────────────────────

const ALLOWED_STATUSES = ["pending", "processing", "fulfilled", "cancelled"] as const;
type FulfillmentStatus = (typeof ALLOWED_STATUSES)[number];

function isStatus(v: unknown): v is FulfillmentStatus {
  return ALLOWED_STATUSES.includes(v as FulfillmentStatus);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { allowed } = rateLimit(session.user.id, 120, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("fulfillment_status" in patch) {
    if (!isStatus(patch.fulfillment_status)) {
      return NextResponse.json({ error: "Invalid fulfillment_status." }, { status: 400 });
    }
    update.fulfillment_status = patch.fulfillment_status;
    if (patch.fulfillment_status === "fulfilled") {
      update.fulfilled_at = new Date().toISOString();
    }
  }

  if ("tracking_number" in patch) {
    const tn = patch.tracking_number;
    update.tracking_number = typeof tn === "string" ? tn.trim() || null : null;
  }

  if ("internal_notes" in patch) {
    const notes = patch.internal_notes;
    update.internal_notes = typeof notes === "string" ? notes.trim() || null : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(update)
    .eq("id", params.id)
    .select("id, fulfillment_status, tracking_number, internal_notes, fulfilled_at, updated_at")
    .single();

  if (error || !data) {
    console.error("Admin order patch error:", error);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
