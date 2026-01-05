"use client";

import React, { createContext, useContext } from "react";
import { useCart as useCartInternal } from "@/hooks/use-cart";

type CartContextValue = ReturnType<typeof useCartInternal>;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = useCartInternal();
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within <CartProvider>");
  }
  return ctx;
}
