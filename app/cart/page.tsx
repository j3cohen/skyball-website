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

function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
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

  // Load product details for cart items from Supabase
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
        const priceRowIds = items.map((i) => i.priceRowId);

        const { data, error } = await supabase
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

        if (error) throw error;

        const byId = new Map(
          (data ?? []).map((r: any) => [
            r.id,
            {
              unit_amount: r.unit_amount,
              currency: r.currency,
              active: r.active,
              product_active: r.product?.active,
              name: r.product?.name ?? "Unknown item",
              slug: r.product?.slug ?? "",
            },
          ])
        );

        const nextLines: CartLine[] = items
          .map((it) => {
            const row = byId.get(it.priceRowId);
            if (!row) return null;

            // If price/product is inactive, still show it but warn.
            return {
              priceRowId: it.priceRowId,
              qty: it.qty,
              name: row.name,
              unit_amount: row.unit_amount,
              currency: row.currency,
              slug: row.slug,
            };
          })
          .filter(Boolean) as CartLine[];

        setLines(nextLines);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load cart items.");
      } finally {
        setLoadingLines(false);
      }
    };

    run();
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

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Checkout failed.");

      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed.");
      setCheckingOut(false);
    }
  }

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
                      <div key={line.priceRowId} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-lg p-4">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{line.name}</div>
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
                  <div className="text-2xl font-bold">
                    {lines.length ? formatMoney(subtotalCents, lines[0].currency) : "$0.00"}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Taxes/shipping not calculated (v1).
                  </div>
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
