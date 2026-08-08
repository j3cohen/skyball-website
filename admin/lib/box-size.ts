// Box size classification for Pirate Ship CSV export.
//
// Item contents come from the shared BOM in `product-bom.ts` (slug first, then
// product name), so box sizing and the fulfillment cheat sheet can never
// disagree about what's inside a kit.

import type { OrderDataItem } from "./order-types";
import { itemUnitCounts, resolveBom, RACKET_COMPONENTS } from "./product-bom";

export type BoxDimensions = {
  length: number;
  width: number;
  height: number;
  pounds: number;
  ounces: number;
};

export type BoxResult =
  | { kind: "large";      box: BoxDimensions }
  | { kind: "xl";         box: BoxDimensions }
  | { kind: "essentials"; box: BoxDimensions }
  | { kind: "ball";       box: BoxDimensions }
  | { kind: "small";      box: BoxDimensions }
  | { kind: "needs-input" };

// 24×12×6 — multi-racket, Partners packs, 31–50 ball orders, misc large orders
export const LARGE_BOX: BoxDimensions = { length: 24, width: 12, height: 6, pounds: 4, ounces: 0 };
// 24×12×4 — Essentials kit (+ ≤1 extra 3-pack), or ball-only 13–30 balls
export const ESSENTIALS_BOX: BoxDimensions = { length: 24, width: 12, height: 4, pounds: 3, ounces: 0 };
// 10×8×8 — ball-only 4–12 balls (one 12-pack or 2–4 three-packs)
export const BALL_BOX: BoxDimensions = { length: 10, width: 8, height: 8, pounds: 3, ounces: 0 };
// 10×4×4 — single 3-ball pack only
export const SMALL_BOX: BoxDimensions = { length: 10, width: 4, height: 4, pounds: 1, ounces: 0 };
// 48×13×8 — Anywhere Kit / Anywhere Pro (includes net)
export const ANYWHERE_BOX: BoxDimensions = { length: 48, width: 13, height: 8, pounds: 13, ounces: 0 };

function matchItem(item: OrderDataItem, s: string): boolean {
  const slug = (item.slug ?? "").toLowerCase();
  const name = (item.product_name ?? "").toLowerCase();
  return slug.includes(s) || name.includes(s);
}

// Anywhere Kit or Anywhere Pro — both contain a net and ship in ANYWHERE_BOX
function isAnywhereKit(item: OrderDataItem): boolean {
  return matchItem(item, "anywhere");
}

function hasOtherNet(item: OrderDataItem): boolean {
  return itemUnitCounts(item).nets > 0 && !isAnywhereKit(item);
}

function isEssentialsKit(item: OrderDataItem): boolean {
  return matchItem(item, "essentials");
}

// A bare tube of 3 — not a kit that happens to contain one.
function isThreePack(item: OrderDataItem): boolean {
  const { bom } = resolveBom(item);
  const hasRackets = RACKET_COMPONENTS.some((id) => (bom.components[id] ?? 0) > 0);
  return (bom.ballPacks?.[3] ?? 0) > 0 && !hasRackets;
}

// Grips, covers, bags, crewnecks, etc. — items that don't affect box choice
function isSizeNeutralAccessory(item: OrderDataItem): boolean {
  const { rackets, balls, nets } = itemUnitCounts(item);
  return rackets === 0 && balls === 0 && nets === 0;
}

/**
 * Classify the box size for an order given its line items.
 *
 * Rules (first match wins):
 *  - Anywhere Kit/Pro ×1 → ANYWHERE_BOX (48×13×8, 13 lb); qty >1 → needs-input
 *  - any other net item → needs-input
 *  - >8 rackets OR >50 balls → needs-input
 *  - 1× Essentials kit + ≤1 extra 3-pack (accessories OK) → ESSENTIALS_BOX (24×12×4, 3 lb)
 *  - ball-only orders, by total balls:
 *      ≤3 → SMALL_BOX (10×4×4, 1 lb)
 *      4–12 → BALL_BOX (10×8×8, 3 lb)
 *      13–30 → ESSENTIALS_BOX (24×12×4, 3 lb)
 *      31–50 → LARGE_BOX
 *  - everything else (Partners, multi-racket, mixed orders) → LARGE_BOX
 */
export function classifyBoxSize(items: OrderDataItem[]): BoxResult {
  const anywhereItems = items.filter(isAnywhereKit);
  if (anywhereItems.length > 0) {
    const totalAnywhere = anywhereItems.reduce((sum, i) => sum + (i.quantity ?? 1), 0);
    if (totalAnywhere === 1) return { kind: "xl", box: ANYWHERE_BOX };
    return { kind: "needs-input" };
  }

  if (items.some(hasOtherNet)) return { kind: "needs-input" };

  let totalRackets = 0;
  let totalBalls   = 0;

  for (const item of items) {
    const { rackets, balls } = itemUnitCounts(item);
    totalRackets += rackets;
    totalBalls   += balls;
  }

  if (totalRackets > 8 || totalBalls > 50) return { kind: "needs-input" };

  // Essentials box: exactly one Essentials kit plus at most one extra 3-pack;
  // size-neutral add-ons (bags, grips, covers) don't disqualify. Product-level
  // check so Partners packs (same racket/ball counts ×2) don't match.
  const essentialsQty = items.filter(isEssentialsKit).reduce((s, i) => s + (i.quantity ?? 1), 0);
  const threePackQty  = items.filter(i => isThreePack(i) && !isEssentialsKit(i))
                             .reduce((s, i) => s + (i.quantity ?? 1), 0);
  const onlyEssentialsCompatible = items.every(
    i => isEssentialsKit(i) || isThreePack(i) || isSizeNeutralAccessory(i)
  );
  if (onlyEssentialsCompatible && essentialsQty === 1 && threePackQty <= 1) {
    return { kind: "essentials", box: ESSENTIALS_BOX };
  }

  // Ball-only tiers
  if (totalRackets === 0 && totalBalls > 0) {
    if (totalBalls <= 3)  return { kind: "small",      box: SMALL_BOX };
    if (totalBalls <= 12) return { kind: "ball",       box: BALL_BOX };
    if (totalBalls <= 30) return { kind: "essentials", box: ESSENTIALS_BOX };
    return { kind: "large", box: LARGE_BOX }; // 31–50 balls, incl. a lone 50-pack
  }

  return { kind: "large", box: LARGE_BOX };
}
