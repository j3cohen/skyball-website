// app/cart/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { supabase } from "@/lib/supabaseClient";



type CartLine = {
  priceRowId: string;
  qty: number;
  name: string;
  unit_amount: number; // cents
  currency: string;
  slug: string;
};

type CartItem = {
  priceRowId: string;
  qty: number;
};

type ProductJoin = {
  slug: string;
  name: string;
  active: boolean;
};

type PriceRowJoinRaw = {
  id: string;
  unit_amount: number;
  currency: string;
  active: boolean;
  product: ProductJoin | ProductJoin[] | null;
};

type PriceRowJoin = {
  id: string;
  unit_amount: number;
  currency: string;
  active: boolean;
  product: ProductJoin | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isProductJoin(v: unknown): v is ProductJoin {
  if (!isRecord(v)) return false;
  return (
    typeof v.slug === "string" &&
    typeof v.name === "string" &&
    typeof v.active === "boolean"
  );
}

function normalizeProduct(v: unknown): ProductJoin | null {
  if (isProductJoin(v)) return v;
  if (Array.isArray(v) && v.length > 0 && isProductJoin(v[0])) return v[0];
  return null;
}

function isPriceRowJoinRaw(v: unknown): v is PriceRowJoinRaw {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.unit_amount === "number" &&
    typeof v.currency === "string" &&
    typeof v.active === "boolean" &&
    "product" in v
  );
}

function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  const cur = currency.toUpperCase();
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount);
}

export default function CartPage() {
  const { items, hydrated, setQty, removeItem, clearCart } = useCart();

  const [lines, setLines] = useState<CartLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotalCents = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.unit_amount * l.qty, 0);
  }, [lines]);

  useEffect(() => {
    if (!hydrated) return;

    const run = async () => {
      setError(null);

      if (items.length === 0) {
        setLines([]);
        return;
      }

      setLoadingLines(true);

      try {
        const cartItems: CartItem[] = items.map((i) => ({ priceRowId: i.priceRowId, qty: i.qty }));
        const priceRowIds = cartItems.map((i) => i.priceRowId);

        const { data, error: sbErr } = await supabase
          .from("product_prices")
          .select(
            `
              id,
              unit_amount,
              currency,
              active,
              product:products (
                slug,
                name,
                active
              )
            `
          )
          .in("id", priceRowIds);

        if (sbErr) throw sbErr;

        const raw: unknown = data ?? [];
        const arr: unknown[] = Array.isArray(raw) ? raw : [];

        const rows: PriceRowJoin[] = arr
          .filter(isPriceRowJoinRaw)
          .map((r) => ({
            id: r.id,
            unit_amount: r.unit_amount,
            currency: r.currency,
            active: r.active,
            product: normalizeProduct(r.product),
          }));

        const byId = new Map<string, PriceRowJoin>(rows.map((r) => [r.id, r]));

        const nextLines: CartLine[] = cartItems
          .map((it) => {
            const row = byId.get(it.priceRowId);
            const prod = row?.product;
            if (!row || !prod) return null;

            return {
              priceRowId: it.priceRowId,
              qty: it.qty,
              name: prod.name,
              unit_amount: row.unit_amount,
              currency: row.currency,
              slug: prod.slug,
            };
          })
          .filter((x): x is CartLine => x !== null);

        setLines(nextLines);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load cart items.";
        setError(message);
      } finally {
        setLoadingLines(false);
      }
    };

    void run();
  }, [items, hydrated]);

  async function checkout() {
    try {
      setCheckingOut(true);
      setError(null);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ priceRowId: i.priceRowId, qty: i.qty })),
        }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Checkout failed.";
        throw new Error(message);
      }

      const url =
        typeof data === "object" &&
        data !== null &&
        "url" in data &&
        typeof (data as { url: unknown }).url === "string"
          ? (data as { url: string }).url
          : null;

      if (!url) throw new Error("Checkout failed: missing redirect URL.");

      window.location.href = url;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Checkout failed.";
      setError(message);
      setCheckingOut(false);
    }
  }

  const currency = lines.length ? lines[0].currency : "usd";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Cart</h1>
            <p className="text-gray-600 mt-2">Review your items and checkout with Stripe.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          {!hydrated ? (
            <div className="text-gray-600">Loading…</div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8">
              <p className="text-gray-700 mb-4">Your cart is empty.</p>
              <Link href="/shop">
                <Button className="bg-sky-600 hover:bg-sky-700">Go to Shop</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="bg-white rounded-xl shadow">
                <div className="p-6 border-b flex items-center justify-between">
                  <div className="font-semibold">Items</div>
                  <Button variant="outline" onClick={clearCart}>
                    Clear cart
                  </Button>
                </div>

                <div className="p-6 space-y-4">
                  {loadingLines ? (
                    <div className="text-gray-600">Loading items…</div>
                  ) : (
                    lines.map((line) => (
                      <div
                        key={line.priceRowId}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-lg p-4"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            <Link href={`/products/${line.slug}`} className="hover:underline">
                              {line.name}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatMoney(line.unit_amount, line.currency)} each
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center border rounded-lg overflow-hidden">
                            <button
                              className="px-3 py-2 hover:bg-gray-100"
                              onClick={() => setQty(line.priceRowId, Math.max(0, line.qty - 1))}
                              aria-label="Decrease quantity"
                            >
                              –
                            </button>
                            <div className="px-3 py-2 min-w-[2.5rem] text-center">{line.qty}</div>
                            <button
                              className="px-3 py-2 hover:bg-gray-100"
                              onClick={() => setQty(line.priceRowId, Math.min(20, line.qty + 1))}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>

                          <div className="font-semibold w-28 text-right">
                            {formatMoney(line.unit_amount * line.qty, line.currency)}
                          </div>

                          <Button variant="outline" onClick={() => removeItem(line.priceRowId)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-gray-600">Subtotal</div>
                  <div className="text-2xl font-bold">{formatMoney(subtotalCents, currency)}</div>
                  <div className="text-sm text-gray-500 mt-1">Taxes/shipping not calculated (v1).</div>
                </div>

                <div className="flex gap-3">
                  <Link href="/shop">
                    <Button variant="outline">Continue shopping</Button>
                  </Link>
                  <Button
                    className="bg-sky-600 hover:bg-sky-700"
                    onClick={checkout}
                    disabled={checkingOut || items.length === 0}
                  >
                    {checkingOut ? "Redirecting…" : "Checkout"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

