// lib/order-csv.ts
//
// The orders CSV, in one place. The fulfillment table can export the rows on
// screen or every row matching the current filters; both go through here so the
// two exports can never end up with different columns.

import type { ExportableOrder, OrderData } from "./order-types";

export type SummaryColors = { ballColor?: string; gripColors?: string[] };

/**
 * Recover per-item colours from `order_summary` when an item has no
 * `customizations` block (older orders, and anything imported from Stripe).
 *
 * Format: "Qty x Name ($price) [ball:orange] | Qty x Name ($price) [grips:r,r]"
 * Keyed by product name rather than position, because `order_data.items` and
 * `order_summary` are not always in the same order.
 */
export function parseSummaryColorsByName(summary: string | null): Map<string, SummaryColors> {
  const map = new Map<string, SummaryColors>();
  if (!summary) return map;
  for (const part of summary.split(" | ")) {
    if (part.startsWith("Total:")) continue;
    const nameMatch = part.match(/^\d+x (.+?) \(\$/);
    if (!nameMatch) continue;
    const out: SummaryColors = {};
    const ball = part.match(/\[ball:([^\]]+)\]/);
    if (ball) out.ballColor = ball[1].trim();
    const grip = part.match(/\[grips:([^\]]+)\]/);
    if (grip) out.gripColors = grip[1].split(",").map((s) => s.trim());
    map.set(nameMatch[1].trim().toLowerCase(), out);
  }
  return map;
}

export function getOrderNote(order: ExportableOrder): string | null {
  const data = order.order_data as { customer_selections?: { order_notes?: string | null } } | null;
  return data?.customer_selections?.order_notes ?? null;
}

type RawItem = {
  product_name?: string | null;
  slug?: string | null;
  quantity?: number | null;
  customizations?: Record<string, unknown>;
};

function orderItems(o: ExportableOrder): RawItem[] {
  return ((o.order_data as OrderData | null)?.items as RawItem[] | undefined) ?? [];
}

const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

/**
 * One row per order, with item columns widened to the largest order in the set.
 * Ball and grip colours come from customizations, falling back to the summary.
 */
export function buildOrdersCsv(orders: ExportableOrder[]): string {
  const maxItems = orders.reduce((m, o) => Math.max(m, orderItems(o).length), 0);

  const itemHeaders: string[] = [];
  for (let i = 1; i <= maxItems; i++) {
    itemHeaders.push(`Item ${i}`, `Qty ${i}`, `Ball ${i}`, `Grips ${i}`);
  }

  const headers = ["Customer Name", "Email", "Date", "Status", "Total", "Note", ...itemHeaders];
  const rows: string[] = [headers.join(",")];

  for (const order of orders) {
    const items      = orderItems(order);
    const summaryMap = parseSummaryColorsByName(order.order_summary);
    const note       = getOrderNote(order) ?? "";
    const total      = ((order.order_total_cents ?? 0) / 100).toFixed(2);
    const date       = new Date(order.created_at).toLocaleDateString("en-US");

    const itemCells: string[] = [];
    for (let i = 0; i < maxItems; i++) {
      const item = items[i];
      if (!item) { itemCells.push("", "", "", ""); continue; }
      const name  = (item.product_name ?? item.slug ?? "").toLowerCase();
      const fb    = summaryMap.get(name) ?? {};
      const ball  = (item.customizations?.ball_color  as string   | undefined) ?? fb.ballColor  ?? "";
      const grips = (item.customizations?.grip_colors as string[] | undefined) ?? fb.gripColors ?? [];
      itemCells.push(
        esc(item.product_name ?? item.slug ?? ""),
        String(item.quantity ?? 1),
        ball,
        esc(grips.join(", ")),
      );
    }

    rows.push([
      esc(order.customer_name ?? ""),
      esc(order.customer_email ?? ""),
      date,
      order.fulfillment_status,
      total,
      esc(note),
      ...itemCells,
    ].join(","));
  }

  return rows.join("\n");
}
