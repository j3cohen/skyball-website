"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CART_STORAGE_KEY, CartItem, normalizeCart } from "@/lib/cart";

function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
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

  // Hydrate once on mount
  useEffect(() => {
    setItems(readCartFromStorage());
    setHydrated(true);
  }, []);

  // Persist on change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    writeCartToStorage(items);
  }, [items, hydrated]);

  const addItem = useCallback((priceRowId: string, qty: number = 1) => {
    setItems((prev) => normalizeCart([...prev, { priceRowId, qty }]));
  }, []);

  const setQty = useCallback((priceRowId: string, qty: number) => {
    setItems((prev) => {
      const next = prev
        .map((it) => (it.priceRowId === priceRowId ? { ...it, qty } : it))
        .filter((it) => it.qty > 0);
      return normalizeCart(next);
    });
  }, []);

  const removeItem = useCallback((priceRowId: string) => {
    setItems((prev) => prev.filter((it) => it.priceRowId !== priceRowId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const count = useMemo(() => items.reduce((sum, it) => sum + it.qty, 0), [items]);

  return { items, hydrated, count, addItem, setQty, removeItem, clearCart };
}
