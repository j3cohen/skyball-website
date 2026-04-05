// app/api/admin/orders/bulk-update/route.ts
// PATCH /api/admin/orders/bulk-update
// Applies status/tracking/cost updates to multiple orders.
// Protected: caller must be an authenticated admin user.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["pending", "processing", "fulfilled", "cancelled"] as const;
type FulfillmentStatus = (typeof ALLOWED_STATUSES)[number];

function isStatus(v: unknown): v is FulfillmentStatus {
  return ALLOWED_STATUSES.includes(v as FulfillmentStatus);
}

type UpdateItem = {
  id: string;
  fulfillment_status?: string;
  tracking_number?: string | null;
  shipping_label_cost?: number | null;
};

export async function PATCH(req: Request) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { updates } = body as { updates?: unknown };

  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "updates must be an array." }, { status: 400 });
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No updates provided." }, { status: 400 });
  }

  if (updates.length > 200) {
    return NextResponse.json({ error: "Too many updates (max 200)." }, { status: 400 });
  }

  // Validate each update item
  const validatedUpdates: UpdateItem[] = [];
  for (let i = 0; i < updates.length; i++) {
    const item = updates[i];
    if (typeof item !== "object" || item === null) {
      return NextResponse.json({ error: `Update at index ${i} is invalid.` }, { status: 400 });
    }
    const u = item as Record<string, unknown>;

    if (typeof u.id !== "string" || !u.id.trim()) {
      return NextResponse.json({ error: `Update at index ${i} missing id.` }, { status: 400 });
    }

    const validated: UpdateItem = { id: u.id.trim() };

    if ("fulfillment_status" in u) {
      if (!isStatus(u.fulfillment_status)) {
        return NextResponse.json(
          { error: `Update at index ${i} has invalid fulfillment_status.` },
          { status: 400 }
        );
      }
      validated.fulfillment_status = u.fulfillment_status as string;
    }

    if ("tracking_number" in u) {
      const tn = u.tracking_number;
      validated.tracking_number = typeof tn === "string" ? tn.trim() || null : null;
    }

    if ("shipping_label_cost" in u) {
      const cost = u.shipping_label_cost;
      if (cost !== null && cost !== undefined) {
        const num = Number(cost);
        if (isNaN(num) || num < 0) {
          return NextResponse.json(
            { error: `Update at index ${i} has invalid shipping_label_cost.` },
            { status: 400 }
          );
        }
        validated.shipping_label_cost = num;
      } else {
        validated.shipping_label_cost = null;
      }
    }

    validatedUpdates.push(validated);
  }

  // Apply updates in a loop
  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const item of validatedUpdates) {
    const patch: Record<string, unknown> = {};

    if (item.fulfillment_status !== undefined) {
      patch.fulfillment_status = item.fulfillment_status;
      if (item.fulfillment_status === "fulfilled") {
        patch.fulfilled_at = new Date().toISOString();
      }
    }

    if (item.tracking_number !== undefined) {
      patch.tracking_number = item.tracking_number;
    }

    if (item.shipping_label_cost !== undefined) {
      patch.shipping_label_cost = item.shipping_label_cost;
    }

    if (Object.keys(patch).length === 0) {
      results.push({ id: item.id, success: false, error: "No valid fields to update." });
      continue;
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", item.id);

    if (error) {
      console.error(`Bulk update error for order ${item.id}:`, error);
      results.push({ id: item.id, success: false, error: "Update failed." });
    } else {
      results.push({ id: item.id, success: true });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({ results, successCount, totalRequested: validatedUpdates.length });
}
