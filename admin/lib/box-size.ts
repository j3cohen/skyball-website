// Box size classification for Pirate Ship CSV export.
// Uses product slug (preferred) or product_name (fallback) to determine
// the correct box dimensions for each order.

import type { OrderDataItem } from "./order-types";

export type BoxDimensions = {
  length: number;
  width: number;
  height: number;
  pounds: number;
  ounces: number;
};

export type BoxResult =
  | { kind: "large"; box: BoxDimensions }
  | { kind: "small"; box: BoxDimensions }
  | { kind: "needs-input" };

// 24×12×6 — essentials kits, partners packs, multi-racket, multi-ball orders
export const LARGE_BOX: BoxDimensions = { length: 24, width: 12, height: 6, pounds: 4, ounces: 0 };
// 10×4×4 — single 3-ball pack only
export const SMALL_BOX: BoxDimensions = { length: 10, width: 4, height: 4, pounds: 1, ounces: 0 };

function getItemCounts(item: OrderDataItem): { rackets: number; balls: number } {
  const slug = (item.slug ?? "").toLowerCase();
  const name = (item.product_name ?? "").toLowerCase();
  const qty  = item.quantity ?? 1;

  const match = (s: string) => slug.includes(s) || name.includes(s);

  // Kits (contain both rackets and balls)
  if (match("partners"))  return { rackets: 4 * qty, balls: 3 * qty };
  if (match("essentials")) return { rackets: 2 * qty, balls: 3 * qty };

  // Single racket (exclude covers/bags)
  if (match("racket") && !match("bag")) return { rackets: qty, balls: 0 };

  // Ball packs — check largest first to avoid partial matches
  if (match("50-pack") || match("50 pack")) return { rackets: 0, balls: 50 * qty };
  if (match("12-pack") || match("12 pack")) return { rackets: 0, balls: 12 * qty };
  if (match("3-pack")  || match("3 pack"))  return { rackets: 0, balls: 3  * qty };

  // Accessories (grips, covers, crewnecks) — don't contribute to size logic
  return { rackets: 0, balls: 0 };
}

/**
 * Classify the box size for an order given its line items.
 *
 * Rules:
 *  - >8 rackets OR >50 balls → needs-input
 *  - exactly 1×3-ball-pack, no rackets → small box
 *  - everything else (kits, multi-racket, multi-ball, accessories) → large box
 */
function hasNet(item: OrderDataItem): boolean {
  const slug = (item.slug ?? "").toLowerCase();
  const name = (item.product_name ?? "").toLowerCase();
  return slug.includes("net") || name.includes("net") ||
         slug.includes("anywhere") || name.includes("anywhere");
}

/**
 * Classify the box size for an order given its line items.
 *
 * Rules:
 *  - any item containing a net → needs-input
 *  - >8 rackets OR >50 balls → needs-input
 *  - exactly 1×3-ball-pack, no rackets → small box
 *  - everything else (kits, multi-racket, multi-ball, accessories) → large box
 */
export function classifyBoxSize(items: OrderDataItem[]): BoxResult {
  if (items.some(hasNet)) return { kind: "needs-input" };

  let totalRackets = 0;
  let totalBalls   = 0;

  for (const item of items) {
    const { rackets, balls } = getItemCounts(item);
    totalRackets += rackets;
    totalBalls   += balls;
  }

  if (totalRackets > 8 || totalBalls > 50) return { kind: "needs-input" };
  if (totalRackets === 0 && totalBalls > 0 && totalBalls <= 3) return { kind: "small", box: SMALL_BOX };
  return { kind: "large", box: LARGE_BOX };
}
