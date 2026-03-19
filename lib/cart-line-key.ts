// lib/cart-line-key.ts
import type { CartItemMeta } from "@/lib/cart";

export function cartLineKey(priceRowId: string, meta?: CartItemMeta): string {
  const grips = meta?.gripColors ?? [];
  const balls = meta?.ballColors ?? [];
  const size = meta?.crewneckSize ?? "";
  return `${priceRowId}|grips:${grips.join(",")};balls:${balls.join(",")};size:${size}`;
}