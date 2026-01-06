"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";

type Props = {
  priceRowId: string;
  qty?: number;
  label?: string;
  className?: string;
};

export default function AddToCart({
  priceRowId,
  qty = 1,
  label = "Add to cart",
  className,
}: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1100);
    return () => window.clearTimeout(t);
  }, [added]);

  return (
    <Button
      className={className}
      type="button"
      onClick={() => {
        addItem(priceRowId, qty);
        setAdded(true);
      }}
      aria-live="polite"
    >
      <span
        className={[
          "inline-flex items-center gap-2 transition-all",
          added ? "scale-[0.98]" : "",
        ].join(" ")}
      >
        {added ? (
          <>
            {/* simple check icon without deps */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Added
          </>
        ) : (
          label
        )}
      </span>
    </Button>
  );
}
