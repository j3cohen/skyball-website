"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BuyNowButton() {
  const [loading, setLoading] = useState(false);

  async function onBuyNow() {
    try {
      setLoading(true);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ priceRowId: "cf3ff560-9d22-44dd-a5aa-4a58d9bdc60f", qty: 1 }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout failed");

      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={onBuyNow} disabled={loading}>
      {loading ? "Redirecting…" : "Buy SkyBall Racket Pro"}
    </Button>
  );
}
