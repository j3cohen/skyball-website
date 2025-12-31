// lib/cart.ts
export const CART_STORAGE_KEY = "skyball_cart_v1";

export type CartItemMeta = {
  gripColors?: string[]; // e.g. ["pink", "white"] (duplicates allowed)
};

export type CartItem = {
  id: string;          // local unique id (so same priceRowId can exist with different metadata)
  priceRowId: string;  // public.product_prices.id
  qty: number;
  meta?: CartItemMeta;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const x of v) if (typeof x === "string") out.push(x);
  return out;
}

function normalizeMeta(v: unknown): CartItemMeta | undefined {
  if (!isRecord(v)) return undefined;

  const gripColors = "gripColors" in v ? toStringArray(v.gripColors) : undefined;
  const meta: CartItemMeta = {};
  if (gripColors && gripColors.length > 0) meta.gripColors = gripColors;

  return Object.keys(meta).length > 0 ? meta : undefined;
}

function normalizeItem(v: unknown): CartItem | null {
  if (!isRecord(v)) return null;

  const id = typeof v.id === "string" ? v.id : crypto.randomUUID();
  const priceRowId = typeof v.priceRowId === "string" ? v.priceRowId : "";
  const qty = typeof v.qty === "number" && Number.isInteger(v.qty) ? v.qty : 0;

  if (!priceRowId || qty <= 0) return null;

  const meta = "meta" in v ? normalizeMeta(v.meta) : undefined;

  return { id, priceRowId, qty, meta };
}

// We do NOT auto-merge items with different meta.
// We ONLY merge if both priceRowId and meta are the same.
function sameMeta(a?: CartItemMeta, b?: CartItemMeta): boolean {
  const aColors = a?.gripColors ?? [];
  const bColors = b?.gripColors ?? [];
  if (aColors.length !== bColors.length) return false;
  for (let i = 0; i < aColors.length; i++) {
    if (aColors[i] !== bColors[i]) return false; // order matters (user picked specific sequence)
  }
  return true;
}

export function normalizeCart(raw: unknown[]): CartItem[] {
  const cleaned: CartItem[] = [];
  for (const v of raw) {
    const it = normalizeItem(v);
    if (it) cleaned.push(it);
  }

  const merged: CartItem[] = [];
  for (const it of cleaned) {
    const existing = merged.find(
      (m) => m.priceRowId === it.priceRowId && sameMeta(m.meta, it.meta)
    );
    if (existing) {
      existing.qty = Math.min(20, existing.qty + it.qty);
    } else {
      merged.push({ ...it });
    }
  }

  return merged;
}
