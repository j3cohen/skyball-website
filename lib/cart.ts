export type CartItem = {
  priceRowId: string; // public.product_prices.id
  qty: number;
};

export type CartState = {
  items: CartItem[];
};

export const CART_STORAGE_KEY = "skyball_cart_v1";

export function normalizeCart(items: CartItem[]): CartItem[] {
  // Merge duplicates + clamp qty
  const map = new Map<string, number>();
  for (const it of items) {
    if (!it?.priceRowId) continue;
    const qty = Number.isFinite(it.qty) ? Math.floor(it.qty) : 1;
    const clamped = Math.max(1, Math.min(20, qty));
    map.set(it.priceRowId, (map.get(it.priceRowId) ?? 0) + clamped);
  }
  return Array.from(map.entries()).map(([priceRowId, qty]) => ({ priceRowId, qty }));
}
