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

  // Prevent body scroll when modal is open
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

  const isGrip = useMemo(() => isGripSlug(addonSlug), [addonSlug]);
  const packSize = useMemo(
    () => (isGrip ? packSizeForGripSlug(addonSlug) : 0),
    [isGrip, addonSlug]
  );

  const buttonLabel = props.label ?? "Add";

  // Non-grip add-ons: single button
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

  // Grip add-ons: both buttons open the modal color picker
  return (
    <>
      <div className="flex flex-col gap-2 items-end">
        <Button
          type="button"
          className="w-auto px-4 py-2 h-auto text-sm"
          onClick={() => setOpen(true)}
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
          className="w-auto px-4 py-2 h-auto text-sm"
          onClick={() => setOpen(true)}
        >
          Choose colors
        </Button>
      </div>

      {/* Modal overlay */}
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

            <GripColorPicker
              requiredCount={packSize}
              onConfirm={(colors: GripColor[]) => {
                addItemWithMeta(priceRowId, { gripColors: colors }, 1);
                setOpen(false);
                setAdded(true);
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
        </div>
      )}
    </>
  );
}