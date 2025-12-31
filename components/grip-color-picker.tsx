"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { GripColor } from "@/lib/cart";
import { cn } from "@/lib/utils";

const COLORS: { key: GripColor; label: string }[] = [
  { key: "white", label: "White" },
  { key: "blue", label: "Blue" },
  { key: "orange", label: "Orange" },
  { key: "yellow", label: "Yellow" },
  { key: "pink", label: "Pink" },
];

function titleForCount(n: number): string {
  if (n === 1) return "Choose 1 grip color";
  return `Choose ${n} grip colors`;
}

export function GripColorPicker(props: {
  requiredCount: number; // 1, 2, 4 (or qty*packSize)
  onConfirm: (colors: GripColor[]) => void;
  className?: string;
}) {
  const { requiredCount, onConfirm, className } = props;

  const [selected, setSelected] = useState<GripColor[]>([]);

  const canConfirm = selected.length === requiredCount;

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

      {selected.length > 0 && (
        <div className="text-sm text-gray-700">
          Selected ({selected.length}/{requiredCount}):
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
          {remaining > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              Select {remaining} more.
            </div>
          )}
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        onClick={() => onConfirm(selected)}
        disabled={!canConfirm}
      >
        Add grips to cart
      </Button>
    </div>
  );
}
