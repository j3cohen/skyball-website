"use client";

import { useMemo, useState } from "react";
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

export function AddonAddToCart(props: {
  priceRowId: string;     // product_prices.id
  addonSlug: string;      // products.slug
  label?: string;
}) {
  const { addItem, addItemWithMeta } = useCart();
  const { priceRowId, addonSlug } = props;

  const [open, setOpen] = useState(false);

  const isGrip = useMemo(() => isGripSlug(addonSlug), [addonSlug]);
  const packSize = useMemo(() => (isGrip ? packSizeForGripSlug(addonSlug) : 0), [isGrip, addonSlug]);

  if (!isGrip) {
    return (
      <Button type="button" onClick={() => addItem(priceRowId, 1)}>
        {props.label ?? "Add to cart"}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <Button type="button" onClick={() => setOpen(true)}>
          {props.label ?? "Choose colors"}
        </Button>
      ) : (
        <div className="rounded-xl border p-4 bg-white">
          <GripColorPicker
            requiredCount={packSize}
            onConfirm={(colors: GripColor[]) => {
              addItemWithMeta(priceRowId, { gripColors: colors }, 1);
              setOpen(false);
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
