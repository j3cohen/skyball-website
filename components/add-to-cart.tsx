"use client";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";

export default function AddToCart() {
  const { addItem } = useCart();

  return (
    <Button
      onClick={() => addItem("cf3ff560-9d22-44dd-a5aa-4a58d9bdc60f", 1)}
    >
      Add SkyBall Racket Pro to Cart
    </Button>
  );
}
