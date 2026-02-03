// components/grip-color-picker.tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GripColor } from "@/lib/cart";
import { cn } from "@/lib/utils";

const COLORS: { key: GripColor; label: string }[] = [
  { key: "random", label: "Random" }, // ✅ add
  { key: "white", label: "White" },
  //sold out{ key: "blue", label: "Blue" },
  { key: "orange", label: "Orange" },
  { key: "yellow", label: "Yellow" },
  { key: "pink", label: "Pink" },
];

function titleForCount(n: number): string {
  if (n === 1) return "Choose 1 grip color";
  return `Choose ${n} grip colors`;
}

export function GripColorPicker(props: {
  requiredCount: number;
  onConfirm: (colors: GripColor[]) => void;
  className?: string;
}) {
  const { requiredCount, onConfirm, className } = props;

  const [selected, setSelected] = useState<GripColor[]>([]);

  const remaining = useMemo(() => {
    const r = requiredCount - selected.length;
    return r > 0 ? r : 0;
  }, [requiredCount, selected.length]);

  function addColor(c: GripColor) {
    if (selected.length >= requiredCount) return;
    setSelected((prev) => [...prev, c]); // duplicates allowed
  }

  function removeAt(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }

  function confirm() {
    // ✅ pad defaults with "random"
    const out = [...selected];
    while (out.length < requiredCount) out.push("random");
    onConfirm(out);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="font-medium">{titleForCount(requiredCount)}</div>

      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <Button
            key={c.key}
            type="button"
            variant="outline"
            onClick={() => addColor(c.key)}
            disabled={selected.length >= requiredCount}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <div className="text-sm text-gray-700">
        Selected ({selected.length}/{requiredCount})
        {selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map((c, idx) => (
              <button
                key={`${c}-${idx}`}
                type="button"
                className="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
                onClick={() => removeAt(idx)}
                title="Click to remove"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {remaining > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            If you don’t pick the remaining {remaining}, they’ll default to <b>random</b>.
          </div>
        )}
      </div>

      <Button type="button" className="w-full" onClick={confirm}>
        Add grips to cart
      </Button>
    </div>
  );
}
