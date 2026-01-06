"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { GripColorPicker } from "@/components/grip-color-picker";
import type { GripColor } from "@/lib/cart";

function isGripSlug(slug: string): boolean {
  return (
    slug === "professional-over-grip-skyball" ||
    slug === "professional-over-grips-skyball-2-pack" ||
    slug === "professional-over-grips-skyball-4-pack"
  );
}

function packSizeForGripSlug(slug: string): number {
  if (slug === "professional-over-grip-skyball") return 1;
  if (slug === "professional-over-grips-skyball-2-pack") return 2;
  return 4;
}

function makeRandomColors(n: number): GripColor[] {
  return Array.from({ length: n }, () => "random");
}

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

export function AddonAddToCart(props: {
  priceRowId: string;
  addonSlug: string;
  label?: string;
}) {
  const { addItem, addItemWithMeta } = useCart();
  const { priceRowId, addonSlug } = props;

  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1100);
    return () => window.clearTimeout(t);
  }, [added]);

  const isGrip = useMemo(() => isGripSlug(addonSlug), [addonSlug]);
  const packSize = useMemo(
    () => (isGrip ? packSizeForGripSlug(addonSlug) : 0),
    [isGrip, addonSlug]
  );

  const buttonLabel = props.label ?? "Add";

  // Non-grip add-ons: single button, show "Added" feedback
  if (!isGrip) {
    return (
      <Button
        type="button"
        className="w-auto px-4 py-2 h-auto text-sm"
        onClick={() => {
          addItem(priceRowId, 1);
          setAdded(true);
        }}
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2">
          {added ? (
            <>
              <CheckIcon />
              Added
            </>
          ) : (
            buttonLabel
          )}
        </span>
      </Button>
    );
  }

  // Grip add-ons: keep your two-button closed layout + picker open state
  return (
    <div className="space-y-3">
      {!open ? (
        /* CLOSED STATE */
        <div className="flex flex-col gap-2 items-end">
          <Button
            type="button"
            className="w-auto px-4 py-2 h-auto text-sm"
            onClick={() => {
              addItemWithMeta(priceRowId, { gripColors: makeRandomColors(packSize) }, 1);
              setAdded(true);
            }}
            aria-live="polite"
          >
            <span className="inline-flex items-center gap-2">
              {added ? (
                <>
                  <CheckIcon />
                  Added
                </>
              ) : (
                buttonLabel
              )}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-auto px-4 py-2 h-auto text-sm whitespace-normal leading-tight text-center max-w-[140px]"
            onClick={() => setOpen(true)}
          >
            Choose colors
          </Button>
        </div>
      ) : (
        /* OPEN STATE */
        <div className="rounded-xl border p-4 bg-white">
          <GripColorPicker
            requiredCount={packSize}
            onConfirm={(colors: GripColor[]) => {
              addItemWithMeta(priceRowId, { gripColors: colors }, 1);
              setOpen(false);
              setAdded(true); // show "Added" when returning to closed state
            }}
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
      )}
    </div>
  );
}
