// components/certification/offer-purchase.tsx
"use client";

// Offer cards + quantity stepper + Buy button for the /coaching sales
// page. Buying POSTs to the certification checkout route and redirects
// to Stripe-hosted checkout.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SalesOffer = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  seatCount: number;
  equipmentItems: { label: string; qty: number }[];
};

// Column count follows the number of offers so 3 offers don't leave a hole in a
// 4-wide grid. Classes are spelled out (not interpolated) so Tailwind sees them.
const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1 max-w-sm",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export default function OfferPurchase({ offers }: { offers: SalesOffer[] }) {
  const [selected, setSelected] = useState(offers[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offer = offers.find((o) => o.id === selected) ?? offers[0];

  async function buy() {
    if (!offer) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/certification/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, qty }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed.");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
      setLoading(false);
    }
  }

  if (!offer) return null;

  return (
    <div>
      <div
        className={cn(
          "grid gap-4",
          GRID_COLS[offers.length] ?? "sm:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {offers.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelected(o.id)}
            aria-pressed={selected === o.id}
            className={cn(
              // flex-col: a <button> centers its content vertically by default,
              // which staggers the titles across cards of unequal height.
              "flex h-full flex-col items-start rounded-xl border-2 bg-white p-4 text-left transition-colors sm:p-5",
              selected === o.id
                ? "border-primary shadow-md"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            {/* Two-line reservation keeps the prices on one baseline when a
                longer offer name wraps in the narrow 4-up columns. */}
            <p className="font-semibold leading-snug text-gray-900 lg:min-h-[3rem]">{o.name}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              ${(o.priceCents / 100).toFixed(o.priceCents % 100 === 0 ? 0 : 2)}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {o.seatCount} certification seat{o.seatCount === 1 ? "" : "s"}
            </p>
            {o.equipmentItems.length > 0 && (
              <ul className="mt-1 text-sm text-gray-600">
                {o.equipmentItems.map((i, idx) => (
                  <li key={idx}>
                    {i.qty}× {i.label}
                  </li>
                ))}
              </ul>
            )}
            {o.description && <p className="mt-2 text-sm text-gray-500">{o.description}</p>}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Quantity</span>
          <div className="flex items-center rounded-lg border border-gray-300">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-50"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-50"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
        <Button onClick={buy} disabled={loading} size="lg">
          {loading
            ? "Redirecting…"
            : `Buy — $${(((offer.priceCents * qty) / 100) || 0).toFixed(
                (offer.priceCents * qty) % 100 === 0 ? 0 : 2
              )}`}
        </Button>
      </div>
      {qty > 1 && (
        <p className="mt-2 text-sm text-gray-500">
          {qty}× {offer.name} = {offer.seatCount * qty} certification seats
          {offer.equipmentItems.length > 0 && " + equipment multiplied accordingly"}
        </p>
      )}
      {offer.equipmentItems.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          This pack includes equipment — a US shipping address is collected at checkout.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
