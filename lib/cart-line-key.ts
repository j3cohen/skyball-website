// lib/cart-line-key.ts
import type { CartItemMeta } from "@/lib/cart";

export function cartLineKey(priceRowId: string, meta?: CartItemMeta): string {
  const colors = meta?.gripColors ?? [];
  return `${priceRowId}|grips:${colors.join(",")}`;
}
