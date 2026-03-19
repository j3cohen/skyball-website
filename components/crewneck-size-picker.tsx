// components/crewneck-size-picker.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CrewneckSize } from "@/lib/cart";
import { cn } from "@/lib/utils";

const SIZES: { key: CrewneckSize; label: string }[] = [
  { key: "xs", label: "XS" },
  { key: "s", label: "S" },
  { key: "m", label: "M" },
  { key: "l", label: "L" },
  { key: "xl", label: "XL" },
  { key: "xxl", label: "XXL" },
];

export function CrewneckSizePicker(props: {
  onConfirm: (size: CrewneckSize) => void;
  className?: string;
}) {
  const { onConfirm, className } = props;
  const [selected, setSelected] = useState<CrewneckSize | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="font-medium text-base">Choose a size</div>

      <div className="grid grid-cols-3 gap-2">
        {SIZES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSelected(s.key)}
            className={cn(
              "py-3 rounded-lg border-2 text-sm font-semibold transition-all",
              "hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400",
              selected === s.key
                ? "border-sky-500 bg-sky-50 text-sky-700"
                : "border-gray-200 text-gray-700"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={() => selected && onConfirm(selected)}
        disabled={!selected}
      >
        Add to cart
      </Button>
    </div>
  );
}
