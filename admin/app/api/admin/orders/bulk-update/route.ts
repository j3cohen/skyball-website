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

type TrackingEntry = { number: string; tracking_status: string; added_at: string };
type TrackingStatusUpdate = { number: string; tracking_status: string };

type UpdateItem = {
  id: string;
  fulfillment_status?: string;
  tracking_number?: string | null;
  shipping_label_cost?: number | null;
  tracking_entry?: TrackingEntry;
  tracking_status_update?: TrackingStatusUpdate;
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

    if ("tracking_entry" in u) {
      const te = u.tracking_entry as Record<string, unknown>;
      if (typeof te?.number === "string" && te.number.trim()) {
        validated.tracking_entry = {
          number:          te.number.trim(),
          tracking_status: typeof te.tracking_status === "string" ? te.tracking_status : "",
          added_at:        new Date().toISOString(),
        };
      }
    }

    if ("tracking_status_update" in u) {
      const tsu = u.tracking_status_update as Record<string, unknown>;
      if (typeof tsu?.number === "string" && tsu.number.trim()) {
        validated.tracking_status_update = {
          number:          tsu.number.trim(),
          tracking_status: typeof tsu.tracking_status === "string" ? tsu.tracking_status : "",
        };
      }
    }

    validatedUpdates.push(validated);
  }

  // Group updates by order ID so multiple labels for the same order are merged
  const grouped = new Map<string, UpdateItem[]>();
  for (const item of validatedUpdates) {
    if (!grouped.has(item.id)) grouped.set(item.id, []);
    grouped.get(item.id)!.push(item);
  }

  // Pre-fetch current tracking_numbers and shipping_label_cost for all affected orders
  const allIds = [...grouped.keys()];
  const currentTrackingMap = new Map<string, TrackingEntry[]>();
  const currentCostMap = new Map<string, number>();
  {
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("id, tracking_numbers, shipping_label_cost")
      .in("id", allIds);
    for (const row of (rows ?? []) as unknown as {
      id: string;
      tracking_numbers: unknown;
      shipping_label_cost: unknown;
    }[]) {
      currentTrackingMap.set(
        row.id,
        Array.isArray(row.tracking_numbers) ? (row.tracking_numbers as TrackingEntry[]) : []
      );
      currentCostMap.set(row.id, typeof row.shipping_label_cost === "number" ? row.shipping_label_cost : 0);
    }
  }

  // Apply updates per order
  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const [orderId, items] of grouped) {
    const patch: Record<string, unknown> = {};

    // Collect all tracking entries to add and status updates to apply
    const newEntries = items.flatMap((i) => (i.tracking_entry ? [i.tracking_entry] : []));
    const statusUpdates = items.flatMap((i) => (i.tracking_status_update ? [i.tracking_status_update] : []));
    const hasTrackingChanges = newEntries.length > 0 || statusUpdates.length > 0;

    // Sum shipping_label_cost for all new labels in this batch
    const newCosts = items
      .filter((i) => i.tracking_entry && i.shipping_label_cost != null)
      .map((i) => i.shipping_label_cost!);
    if (newCosts.length > 0) {
      const existingCost = currentCostMap.get(orderId) ?? 0;
      patch.shipping_label_cost = existingCost + newCosts.reduce((a, b) => a + b, 0);
    } else {
      // Non-tracking cost update (e.g., manual patch)
      const explicitCost = [...items].reverse().find((i) => i.shipping_label_cost !== undefined && !i.tracking_entry);
      if (explicitCost) patch.shipping_label_cost = explicitCost.shipping_label_cost;
    }

    // Legacy single tracking_number field (take last explicit value)
    const lastTN = [...items].reverse().find((i) => i.tracking_number !== undefined);
    if (lastTN) patch.tracking_number = lastTN.tracking_number;

    if (hasTrackingChanges) {
      // Build final tracking_numbers array
      const existing = [...(currentTrackingMap.get(orderId) ?? [])];

      // Apply status updates to existing entries; if the number only exists in the
      // legacy tracking_number TEXT column (not yet in the JSONB array), migrate it in.
      for (const su of statusUpdates) {
        const idx = existing.findIndex((t) => t.number === su.number);
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], tracking_status: su.tracking_status };
        } else {
          existing.push({ number: su.number, tracking_status: su.tracking_status, added_at: new Date().toISOString() });
        }
      }

      // Append new entries (skip duplicates)
      for (const entry of newEntries) {
        if (!existing.some((t) => t.number === entry.number)) {
          existing.push(entry);
        }
      }

      patch.tracking_numbers = existing;

      // Auto-compute fulfillment_status from tracking entries
      // (honour explicit "cancelled" if set; otherwise derive from delivered state)
      const explicitCancelled = items.some((i) => i.fulfillment_status === "cancelled");
      if (explicitCancelled) {
        patch.fulfillment_status = "cancelled";
      } else {
        // Fulfilled when every label is Delivered or Refunded, with at least one Delivered
        const allDoneOrRefunded =
          existing.length > 0 &&
          existing.every((t) => {
            const s = t.tracking_status.toLowerCase();
            return s === "delivered" || s === "refunded";
          });
        const atLeastOneDelivered = existing.some(
          (t) => t.tracking_status.toLowerCase() === "delivered"
        );
        if (allDoneOrRefunded && atLeastOneDelivered) {
          patch.fulfillment_status = "fulfilled";
          patch.fulfilled_at = new Date().toISOString();
        } else {
          patch.fulfillment_status = "processing";
        }
      }
    } else {
      // No tracking changes — honour any explicit fulfillment_status
      const lastStatus = [...items].reverse().find((i) => i.fulfillment_status !== undefined);
      if (lastStatus) {
        patch.fulfillment_status = lastStatus.fulfillment_status;
        if (lastStatus.fulfillment_status === "fulfilled") {
          patch.fulfilled_at = new Date().toISOString();
        }
      }
    }

    if (Object.keys(patch).length === 0) {
      results.push({ id: orderId, success: false, error: "No valid fields to update." });
      continue;
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", orderId);

    if (error) {
      console.error(`Bulk update error for order ${orderId}:`, error);
      results.push({ id: orderId, success: false, error: "Update failed." });
    } else {
      results.push({ id: orderId, success: true });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({ results, successCount, totalRequested: grouped.size });
}
