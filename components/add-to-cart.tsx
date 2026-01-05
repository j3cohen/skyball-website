"use client";

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

  return (
    <Button
      className={className}
      onClick={() => addItem(priceRowId, qty)}
      type="button"
    >
      {label}
    </Button>
  );
}
