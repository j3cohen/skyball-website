// hooks/use-cart.ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CART_STORAGE_KEY, CartItem, CartItemMeta, normalizeCart } from "@/lib/cart";

function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeCart(parsed);
  } catch {
    return [];
  }
}

function writeCartToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readCartFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeCartToStorage(items);
  }, [items, hydrated]);

  // Add a new line item (unique id). Caller can pass meta (e.g. gripColors)
  const addItem = useCallback(
    (priceRowId: string, qty: number = 1, meta?: CartItemMeta) => {
      const safeQty = Number.isInteger(qty) ? Math.max(1, Math.min(20, qty)) : 1;
      const next: CartItem = {
        id: crypto.randomUUID(),
        priceRowId,
        qty: safeQty,
        meta,
      };
      setItems((prev) => normalizeCart([...prev, next]));
    },
    []
  );

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => {
      const safeQty = Number.isInteger(qty) ? qty : 0;
      const next = prev
        .map((it) => (it.id === id ? { ...it, qty: safeQty } : it))
        .filter((it) => it.qty > 0);
      return normalizeCart(next);
    });
  }, []);

  const updateMeta = useCallback((id: string, meta: CartItemMeta | undefined) => {
    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, meta } : it));
      return normalizeCart(next);
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const count = useMemo(() => items.reduce((sum, it) => sum + it.qty, 0), [items]);

  return { items, hydrated, count, addItem, setQty, updateMeta, removeItem, clearCart };
}
