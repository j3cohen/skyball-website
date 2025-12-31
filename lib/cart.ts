// lib/cart.ts
export const CART_STORAGE_KEY = "skyball_cart_v1";

export type GripColor =
  | "white"
  | "blue"
  | "orange"
  | "yellow"
  | "pink";

export type CartItemMeta = {
  // Only used for grip add-ons right now
  gripColors?: GripColor[];
};

export type CartItem = {
  priceRowId: string; // public.product_prices.id
  qty: number;
  meta?: CartItemMeta;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isGripColor(v: unknown): v is GripColor {
  return (
    v === "white" ||
    v === "blue" ||
    v === "orange" ||
    v === "yellow" ||
    v === "pink"
  );
}

function normalizeMeta(v: unknown): CartItemMeta | undefined {
  if (!isRecord(v)) return undefined;

  const out: CartItemMeta = {};

  if ("gripColors" in v && Array.isArray(v.gripColors)) {
    const colors: GripColor[] = [];
    for (const c of v.gripColors) if (isGripColor(c)) colors.push(c);
    if (colors.length > 0) out.gripColors = colors;
  }

  return Object.keys(out).length ? out : undefined;
}

// Merge items by priceRowId + meta signature (so different color selections don’t get merged incorrectly)
function metaKey(meta?: CartItemMeta): string {
  const colors = meta?.gripColors ?? [];
  // keep order: it matters to the user
  return `grips:${colors.join(",")}`;
}

export function normalizeCart(raw: unknown[]): CartItem[] {
  const items: CartItem[] = [];

  for (const v of raw) {
    if (!isRecord(v)) continue;
    if (typeof v.priceRowId !== "string" || v.priceRowId.length === 0) continue;

    const qty = typeof v.qty === "number" && Number.isInteger(v.qty) ? v.qty : 0;
    if (qty <= 0) continue;

    const meta = "meta" in v ? normalizeMeta(v.meta) : undefined;

    items.push({
      priceRowId: v.priceRowId,
      qty,
      meta,
    });
  }

  // merge
  const map = new Map<string, CartItem>();
  for (const it of items) {
    const key = `${it.priceRowId}|${metaKey(it.meta)}`;
    const prev = map.get(key);
    if (!prev) map.set(key, { ...it });
    else map.set(key, { ...prev, qty: prev.qty + it.qty });
  }

  // clamp qty
  const out = Array.from(map.values()).map((it) => ({
    ...it,
    qty: Math.min(Math.max(it.qty, 1), 20),
  }));

  return out;
}
