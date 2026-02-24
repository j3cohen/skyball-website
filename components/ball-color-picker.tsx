// components/ball-color-picker.tsx
"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BallColor } from "@/lib/cart";
import { cn } from "@/lib/utils";

const BALL_COLORS: { key: BallColor; label: string; hex: string }[] = [
  { key: "blue", label: "Blue", hex: "#3B82F6" },
  { key: "orange", label: "Orange", hex: "#F97316" },
];

function titleForCount(n: number): string {
  if (n === 1) return "Choose a ball color";
  return `Choose ${n} ball colors`;
}

export function BallColorPicker(props: {
  requiredCount: number;
  onConfirm: (colors: BallColor[]) => void;
  className?: string;
}) {
  const { requiredCount, onConfirm, className } = props;
  const [selected, setSelected] = useState<BallColor[]>([]);

  const remaining = useMemo(() => {
    const r = requiredCount - selected.length;
    return r > 0 ? r : 0;
  }, [requiredCount, selected.length]);

  function addColor(c: BallColor) {
    if (selected.length >= requiredCount) return;
    setSelected((prev) => [...prev, c]);
  }

  function removeAt(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }

  function confirm() {
    onConfirm(selected);
  }

  const canConfirm = selected.length === requiredCount;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="font-medium text-base">{titleForCount(requiredCount)}</div>

      <div className="flex gap-3">
        {BALL_COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => addColor(c.key)}
            disabled={selected.length >= requiredCount}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all flex-1",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "hover:border-sky-400 hover:shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-sky-400"
            )}
            style={{ borderColor: selected.some((s) => s === c.key) ? c.hex : undefined }}
          >
            {/* Color swatch */}
            <span
              className="w-10 h-10 rounded-full border border-gray-200 shadow-sm"
              style={{ backgroundColor: c.hex }}
            />
            <span className="text-sm font-medium text-gray-800">{c.label}</span>
          </button>
        ))}
      </div>

      {/* Selected chips */}
      <div className="text-sm text-gray-700">
        Selected ({selected.length}/{requiredCount})
        {selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map((c, idx) => {
              const color = BALL_COLORS.find((bc) => bc.key === c);
              return (
                <button
                  key={`${c}-${idx}`}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-medium shadow-sm hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: color?.hex ?? "#888" }}
                  onClick={() => removeAt(idx)}
                  title="Click to remove"
                >
                  {color?.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
        {remaining > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            {remaining} more {remaining === 1 ? "color" : "colors"} to pick.
          </div>
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={confirm}
        disabled={!canConfirm}
      >
        Add to cart
      </Button>
    </div>
  );
}