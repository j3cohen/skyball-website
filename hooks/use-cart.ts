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

function sameMeta(a?: CartItemMeta, b?: CartItemMeta): boolean {
  const ac = a?.gripColors ?? [];
  const bc = b?.gripColors ?? [];
  if (ac.length !== bc.length) return false;
  for (let i = 0; i < ac.length; i++) if (ac[i] !== bc[i]) return false;
  return true;
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

  const addItem = useCallback((priceRowId: string, qty: number = 1) => {
    setItems((prev) => normalizeCart([...prev, { priceRowId, qty }]));
  }, []);

  const addItemWithMeta = useCallback(
    (priceRowId: string, meta: CartItemMeta, qty: number = 1) => {
      setItems((prev) => normalizeCart([...prev, { priceRowId, qty, meta }]));
    },
    []
  );

  // For editing meta on an existing cart line, we identify by priceRowId + oldMeta
  const updateItemMeta = useCallback(
    (priceRowId: string, oldMeta: CartItemMeta | undefined, newMeta: CartItemMeta) => {
      setItems((prev) => {
        const next: CartItem[] = [];
        for (const it of prev) {
          if (it.priceRowId === priceRowId && sameMeta(it.meta, oldMeta)) {
            next.push({ ...it, meta: newMeta });
          } else {
            next.push(it);
          }
        }
        return normalizeCart(next);
      });
    },
    []
  );

  const setQty = useCallback((priceRowId: string, qty: number) => {
    setItems((prev) => {
      const next = prev
        .map((it) => (it.priceRowId === priceRowId ? { ...it, qty } : it))
        .filter((it) => it.qty > 0);
      return normalizeCart(next);
    });
  }, []);

  const setLineQty = useCallback((priceRowId: string, meta: CartItemMeta | undefined, qty: number) => {
    setItems((prev) => {
      const next = prev
        .map((it) =>
          it.priceRowId === priceRowId && sameMeta(it.meta, meta) ? { ...it, qty } : it
        )
        .filter((it) => it.qty > 0);
      return normalizeCart(next);
    });
  }, []);


  const removeItem = useCallback((priceRowId: string) => {
    setItems((prev) => prev.filter((it) => it.priceRowId !== priceRowId));
  }, []);

  const removeLine = useCallback((priceRowId: string, meta?: CartItemMeta) => {
    setItems((prev) => prev.filter((it) => !(it.priceRowId === priceRowId && sameMeta(it.meta, meta))));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((sum, it) => sum + it.qty, 0), [items]);

  return {
    items,
    hydrated,
    count,
    addItem,
    addItemWithMeta,
    updateItemMeta,
    setQty,
    setLineQty,
    removeItem,
    removeLine,
    clearCart,
  };
}
