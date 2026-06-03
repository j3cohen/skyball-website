// PATCH /api/admin/orders/stripe-import
// Applies Stripe import results: updates refund fields on existing orders
// and creates new order records for charges that have no matching order.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

type RefundUpdate = {
  type: "update-refund";
  orderId: string;
  refundAmountCents: number;
  refundStatus: "none" | "partial" | "full";
};

type NewOrder = {
  type: "new-order";
  chargeId: string;
  checkoutSessionId: string;
  paymentIntentId: string;
  createdAt: string;
  amountCents: number;
  amountRefundedCents: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description: string;
  orderSummary: string;
  orderDataJson: string;
  orderKind: string;
  clsItems: { product_name: string; quantity: number }[];
};

type ImportItem = RefundUpdate | NewOrder;

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { allowed } = rateLimit(session.user.id, 60, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { items } = body as { items?: unknown };
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array." }, { status: 400 });
  }
  if (items.length > 500) {
    return NextResponse.json({ error: "Too many items (max 500)." }, { status: 400 });
  }

  // Validate items
  const validated: ImportItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    if (item.type === "update-refund") {
      if (typeof item.orderId !== "string" || !item.orderId) continue;
      const refundCents = Number(item.refundAmountCents ?? 0);
      const status = item.refundStatus as string;
      if (!["none", "partial", "full"].includes(status)) continue;
      validated.push({
        type: "update-refund",
        orderId: item.orderId,
        refundAmountCents: refundCents,
        refundStatus: status as "none" | "partial" | "full",
      });
    } else if (item.type === "new-order") {
      if (typeof item.chargeId !== "string" || !item.chargeId) continue;
      validated.push({
        type: "new-order",
        chargeId:            String(item.chargeId ?? ""),
        checkoutSessionId:   String(item.checkoutSessionId ?? ""),
        paymentIntentId:     String(item.paymentIntentId ?? ""),
        createdAt:           String(item.createdAt ?? new Date().toISOString()),
        amountCents:         Number(item.amountCents ?? 0),
        amountRefundedCents: Number(item.amountRefundedCents ?? 0),
        currency:            String(item.currency ?? "usd"),
        customerEmail:       String(item.customerEmail ?? ""),
        customerName:        String(item.customerName ?? ""),
        description:         String(item.description ?? ""),
        orderSummary:        String(item.orderSummary ?? ""),
        orderDataJson:       String(item.orderDataJson ?? ""),
        orderKind:           String(item.orderKind ?? "product"),
        clsItems:            Array.isArray(item.clsItems) ? item.clsItems as { product_name: string; quantity: number }[] : [],
      });
    }
  }

  if (validated.length === 0) {
    return NextResponse.json({ error: "No valid items to process." }, { status: 400 });
  }

  let successCount = 0;
  const errors: string[] = [];

  for (const item of validated) {
    if (item.type === "update-refund") {
      // Compute fulfillment_status change for full refunds on unfulfilled orders
      const patch: Record<string, unknown> = {
        refund_amount_cents: item.refundAmountCents,
        refund_status:       item.refundStatus,
      };

      // If fully refunded, fetch current fulfillment status and cancel if not yet shipped
      if (item.refundStatus === "full") {
        const { data: existing } = await supabaseAdmin
          .from("orders")
          .select("fulfillment_status")
          .eq("id", item.orderId)
          .single();
        if (existing && existing.fulfillment_status === "pending") {
          patch.fulfillment_status = "cancelled";
        }
      }

      const { error } = await supabaseAdmin
        .from("orders")
        .update(patch)
        .eq("id", item.orderId);

      if (error) {
        console.error(`stripe-import update error for ${item.orderId}:`, error);
        errors.push(`Update failed for order ${item.orderId}`);
      } else {
        successCount++;
      }
    } else {
      // Create new order
      const refundStatus =
        item.amountRefundedCents === 0                ? "none"
        : item.amountRefundedCents >= item.amountCents ? "full"
        : "partial";

      // Only create a new order for successful (non-failed) charges
      // If fully refunded, mark as cancelled
      const fulfillmentStatus = refundStatus === "full" ? "cancelled" : "pending";

      // Use checkout session ID if present (missed-webhook order), else generate placeholder
      const sessionId = item.checkoutSessionId || `imported_${item.chargeId}`;

      // Reconstruct order_data: prefer parsed metadata, fall back to CLS-parsed items
      let orderData: Record<string, unknown> = {
        version: 1,
        items:   item.clsItems.map((ci) => ({ product_name: ci.product_name, quantity: ci.quantity })),
        source:  "stripe_import",
        kind:    item.orderKind,
      };
      if (item.orderDataJson) {
        try {
          const parsed = JSON.parse(item.orderDataJson) as Record<string, unknown>;
          orderData = { ...parsed, source: "stripe_import", kind: item.orderKind };
        } catch { /* keep default */ }
      }

      const { error } = await supabaseAdmin.from("orders").insert({
        stripe_session_id:        sessionId,
        stripe_payment_intent_id: item.paymentIntentId || null,
        customer_email:           item.customerEmail || null,
        customer_name:            item.customerName  || null,
        order_total_cents:        item.amountCents,
        order_currency:           item.currency,
        order_summary:            item.orderSummary || item.description || null,
        fulfillment_status:       fulfillmentStatus,
        order_data:               orderData,
        refund_amount_cents:      item.amountRefundedCents,
        refund_status:            refundStatus,
        created_at:               item.createdAt,
        internal_notes:           "Created via Stripe import",
      });

      if (error) {
        console.error(`stripe-import create error for charge ${item.chargeId}:`, error);
        errors.push(`Create failed for charge ${item.chargeId}: ${error.message}`);
      } else {
        successCount++;
      }
    }
  }

  return NextResponse.json({ successCount, totalRequested: validated.length, errors });
}
