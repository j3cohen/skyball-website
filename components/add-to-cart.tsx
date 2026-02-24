// components/add-to-cart.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { BallColorPicker } from "@/components/ball-color-picker";
import type { BallColor } from "@/lib/cart";

type Props = {
  priceRowId: string;
  qty?: number;
  label?: string;
  className?: string;
  /** Pass the product slug + kind so we can decide whether to show the color picker */
  productSlug?: string;
  productKind?: "base" | "addon" | "bundle";
};

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Returns true when the product requires a ball color selection. */
function requiresBallColorSelection(
  slug: string | undefined,
  kind: "base" | "addon" | "bundle" | undefined
): boolean {
  if (!slug || !kind) return false;
  if (kind !== "base" && kind !== "bundle") return false;
  if (slug.toLowerCase().includes("crewneck")) return false;
  if (slug.toLowerCase().includes("racket")) return false;
  return true;
}


export default function AddToCart({
  priceRowId,
  qty = 1,
  label = "Add to cart",
  className,
  productSlug,
  productKind,
}: Props) {
  const { addItem, addItemWithMeta } = useCart();
  const [added, setAdded] = useState(false);
  const [open, setOpen] = useState(false);

  const needsColorPick = useMemo(
    () => requiresBallColorSelection(productSlug, productKind),
    [productSlug, productKind]
  );

  const requiredColorCount = useMemo(
    () => (needsColorPick && productSlug ? 1 * qty : 0),
    [needsColorPick, productSlug, qty]
  );

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1100);
    return () => window.clearTimeout(t);
  }, [added]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleSimpleAdd() {
    addItem(priceRowId, qty);
    setAdded(true);
  }

  function handleColorConfirm(colors: BallColor[]) {
    addItemWithMeta(priceRowId, { ballColors: colors }, qty);
    setOpen(false);
    setAdded(true);
  }

  const buttonContent = (
    <span
      className={[
        "inline-flex items-center gap-2 transition-all",
        added ? "scale-[0.98]" : "",
      ].join(" ")}
    >
      {added ? (
        <>
          <CheckIcon />
          Added
        </>
      ) : (
        label
      )}
    </span>
  );

  if (!needsColorPick) {
    return (
      <Button
        className={className}
        type="button"
        onClick={handleSimpleAdd}
        aria-live="polite"
      >
        {buttonContent}
      </Button>
    );
  }

  return (
    <>
      <Button
        className={className}
        type="button"
        onClick={() => setOpen(true)}
        aria-live="polite"
      >
        {buttonContent}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 text-gray-500"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <CloseIcon />
            </button>

            <div className="mb-4">
              <h2 className="text-lg font-semibold">Choose your ball color</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pick the color of SkyBall™ you&apos;d like.
              </p>
            </div>

            <BallColorPicker
              requiredCount={requiredColorCount}
              onConfirm={handleColorConfirm}
            />

            <Button
              type="button"
              variant="ghost"
              className="w-full mt-2"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}