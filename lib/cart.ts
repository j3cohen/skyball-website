// lib/cart.ts
export const CART_STORAGE_KEY = "skyball_cart_v1";

export type BallColor = "blue" | "orange";
export type GripColor =
  | "white"
  | "blue"
  | "orange"
  | "yellow"
  | "pink"
  | "random";
export type CrewneckSize = "xs" | "s" | "m" | "l" | "xl" | "xxl";

export type CartItemMeta = {
  gripColors?: GripColor[];
  ballColors?: BallColor[];
  crewneckSize?: CrewneckSize;
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
    v === "pink" ||
    v === "random"
  );
}

function isBallColor(v: unknown): v is BallColor {
  return v === "blue" || v === "orange";
}

function isCrewneckSize(v: unknown): v is CrewneckSize {
  return v === "xs" || v === "s" || v === "m" || v === "l" || v === "xl" || v === "xxl";
}

function normalizeMeta(v: unknown): CartItemMeta | undefined {
  if (!isRecord(v)) return undefined;
  const out: CartItemMeta = {};

  if ("gripColors" in v && Array.isArray(v.gripColors)) {
    const colors: GripColor[] = [];
    for (const c of v.gripColors) if (isGripColor(c)) colors.push(c);
    if (colors.length > 0) out.gripColors = colors;
  }

  if ("ballColors" in v && Array.isArray(v.ballColors)) {
    const colors: BallColor[] = [];
    for (const c of v.ballColors) if (isBallColor(c)) colors.push(c);
    if (colors.length > 0) out.ballColors = colors;
  }

  if ("crewneckSize" in v && isCrewneckSize(v.crewneckSize)) {
    out.crewneckSize = v.crewneckSize;
  }

  return Object.keys(out).length ? out : undefined;
}

// Key includes grip colors, ball colors, and crewneck size so different selections are never merged
function metaKey(meta?: CartItemMeta): string {
  const grips = meta?.gripColors ?? [];
  const balls = meta?.ballColors ?? [];
  const size = meta?.crewneckSize ?? "";
  return `grips:${grips.join(",")};balls:${balls.join(",")};size:${size}`;
}

export function normalizeCart(raw: unknown[]): CartItem[] {
  const items: CartItem[] = [];
  for (const v of raw) {
    if (!isRecord(v)) continue;
    if (typeof v.priceRowId !== "string" || v.priceRowId.length === 0) continue;
    const qty = typeof v.qty === "number" && Number.isInteger(v.qty) ? v.qty : 0;
    if (qty <= 0) continue;
    const meta = "meta" in v ? normalizeMeta(v.meta) : undefined;
    items.push({ priceRowId: v.priceRowId, qty, meta });
  }

  // merge items with the same priceRowId + meta signature
  const map = new Map<string, CartItem>();
  for (const it of items) {
    const key = `${it.priceRowId}|${metaKey(it.meta)}`;
    const prev = map.get(key);
    if (!prev) map.set(key, { ...it });
    else map.set(key, { ...prev, qty: prev.qty + it.qty });
  }

  // clamp qty
  return Array.from(map.values()).map((it) => ({
    ...it,
    qty: Math.min(Math.max(it.qty, 1), 20),
  }));
}