// lib/cart-line-key.ts
import type { CartItemMeta } from "@/lib/cart";

export function cartLineKey(priceRowId: string, meta?: CartItemMeta): string {
  const grips = meta?.gripColors ?? [];
  const balls = meta?.ballColors ?? [];
  return `${priceRowId}|grips:${grips.join(",")};balls:${balls.join(",")}`;
}