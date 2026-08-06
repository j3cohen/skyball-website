"use client";

import { useEffect } from "react";
import type { DrillTarget } from "@/components/drill-panel";

/**
 * Keep an open drill panel in step with its tab's data.
 *
 * The panel is handed the concrete order ids behind a metric at click time. When
 * the dashboard's date range changes, the tab refetches and those ids go stale —
 * the drawer would keep showing the old slice while the page behind it moved on.
 *
 * This re-emits the same row's target from the freshly loaded data. `targets` is
 * the tab's single construction site for drill targets, so the click handler and
 * this refresh can never build them differently.
 *
 * `namespace` is the prefix every key from this tab carries. It distinguishes
 * "another tab owns this row, leave it alone" from "this tab owns the row and it
 * no longer exists in the new range" — the latter degrades to an empty target so
 * stale numbers are never left on screen.
 */
export function useDrillSync(opts: {
  target: DrillTarget | null;
  targets: Record<string, DrillTarget>;
  namespace: string;
  onDrill: (t: DrillTarget) => void;
  /** Identity of the loaded data — the effect re-runs when this changes. */
  dataToken: unknown;
}) {
  const { target, targets, namespace, onDrill, dataToken } = opts;
  const key = target?.key ?? null;

  useEffect(() => {
    if (!key || !key.startsWith(namespace)) return;
    // A single order's record doesn't depend on the dashboard's date range.
    if (target?.openOrderId) return;

    const next = targets[key];
    onDrill(
      next ?? {
        ...target!,
        orderIds: [],
        breakdown: [],
        subtitle: "No orders in this range",
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataToken, key]);
}
