"use client";

// Shared clickable-row primitive for dashboard cards.
//
// Every card in Sales Data lays its rows out slightly differently, so this owns
// only the interaction — hover affordance, keyboard focus, cursor — and leaves
// the row's contents entirely to the caller.
//
// A row with nothing behind it renders inert rather than opening an empty
// panel, so a zero never looks clickable.

import { ChevronRight } from "lucide-react";

type Props = {
  onDrill?: () => void;
  /** Number of records behind the row; 0 (or no handler) makes it inert. */
  count?: number;
  className?: string;
  children: React.ReactNode;
};

export default function DrillRow({ onDrill, count, className = "", children }: Props) {
  const interactive = Boolean(onDrill) && (count === undefined || count > 0);

  if (!interactive) {
    return <div className={className}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onDrill}
      title="View contributing orders"
      className={`group w-full text-left transition-colors hover:bg-sky-50/60
                  focus:outline-none focus-visible:bg-sky-50 focus-visible:ring-2
                  focus-visible:ring-inset focus-visible:ring-sky-500 ${className}`}
    >
      {children}
      <ChevronRight
        size={14}
        className="ml-1 inline-block shrink-0 align-middle text-transparent
                   transition-colors group-hover:text-sky-400 group-focus-visible:text-sky-400"
      />
    </button>
  );
}
