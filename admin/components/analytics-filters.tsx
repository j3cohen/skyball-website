"use client";

import { useState } from "react";
import { X, Settings2 } from "lucide-react";
import { useRegions, encodeRegion } from "@/lib/regions";
import RegionManagerModal from "./region-manager-modal";

export type DatePreset = "7d" | "30d" | "90d" | "mtd" | "lm" | "ytd" | "all" | "custom";
export type RegionFilter = "all" | "domestic" | "international";

export type AnalyticsFilterState = {
  preset: DatePreset;
  /**
   * "all" | "domestic" | "international", a country code, or a saved region
   * encoded as "countries:US,CA". The encoded form is what reaches the API, so
   * the server resolves a saved region without knowing it exists.
   */
  region: RegionFilter | string;
  /** Display name when `region` is a saved region. */
  regionName?: string | null;
  from: string | null;
  to: string | null;
};

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "mtd", label: "Month to date" },
  { value: "lm",  label: "Last month" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function presetToDates(preset: DatePreset): { from: string | null; to: string | null } {
  const now = new Date();
  const toISO = now.toISOString();

  function daysAgo(n: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  switch (preset) {
    case "7d":  return { from: daysAgo(6), to: toISO };
    case "30d": return { from: daysAgo(29), to: toISO };
    case "90d": return { from: daysAgo(89), to: toISO };
    case "mtd": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: d.toISOString(), to: toISO };
    }
    case "lm": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "ytd": {
      const d = new Date(now.getFullYear(), 0, 1);
      return { from: d.toISOString(), to: toISO };
    }
    case "all": return { from: null, to: null };
    // Custom keeps whatever the date inputs already hold; the caller preserves it.
    case "custom": return { from: null, to: null };
  }
}

/** ISO instant → "YYYY-MM-DD" for binding to <input type="date">. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** A drill-down promoted to a dashboard-wide filter. */
export type FocusState = { dim: string; val: string; label: string };

/**
 * Query params shared by every analytics fetch, so all tabs read the same
 * slice. Keeping this in one place is what stops a tab from quietly ignoring
 * the focus chip and showing numbers that disagree with its neighbours.
 */
export function analyticsParams(
  filters: AnalyticsFilterState,
  focus: FocusState | null,
  extra: Record<string, string> = {}
): URLSearchParams {
  const params = new URLSearchParams(extra);
  if (filters.from) params.set("from", filters.from);
  if (filters.to)   params.set("to",   filters.to);
  if (filters.region !== "all") params.set("region", filters.region);
  if (focus) {
    params.set("focusDim", focus.dim);
    params.set("focusVal", focus.val);
  }
  return params;
}

type Props = {
  value: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
  focus?: FocusState | null;
  onClearFocus?: () => void;
};

export default function AnalyticsFilters({ value, onChange, focus, onClearFocus }: Props) {
  const { regions } = useRegions();
  const [showRegions, setShowRegions] = useState(false);
  function setPreset(preset: DatePreset) {
    if (preset === "custom") {
      // Seed the inputs from the range currently on screen so switching to
      // Custom doesn't blank the report.
      const now = new Date();
      const from = value.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      onChange({ ...value, preset, from, to: value.to ?? now.toISOString() });
      return;
    }
    const dates = presetToDates(preset);
    onChange({ ...value, preset, ...dates });
  }

  function setCustomFrom(day: string) {
    if (!day) return;
    onChange({ ...value, preset: "custom", from: new Date(`${day}T00:00:00`).toISOString() });
  }

  function setCustomTo(day: string) {
    if (!day) return;
    onChange({ ...value, preset: "custom", to: new Date(`${day}T23:59:59.999`).toISOString() });
  }

  function setRegion(region: string, regionName?: string | null) {
    onChange({ ...value, region, regionName: regionName ?? null });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date presets */}
      <div className="flex flex-wrap gap-1">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              value.preset === p.value
                ? "bg-sky-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range inputs */}
      {value.preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={toDateInput(value.from)}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Start date"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={toDateInput(value.to)}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="End date"
          />
        </div>
      )}

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200" />

      {/* Region selector — built-ins, then any saved regions */}
      <div className="flex flex-wrap gap-1">
        {(
          [
            { value: "all",           label: "All" },
            { value: "domestic",      label: "🇺🇸 US" },
            { value: "international", label: "🌍 International" },
          ] as const
        ).map((r) => (
          <button
            key={r.value}
            onClick={() => setRegion(r.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              value.region === r.value
                ? "bg-gray-800 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {r.label}
          </button>
        ))}

        {regions.map((r) => {
          const encoded = encodeRegion(r.countries);
          return (
            <button
              key={r.id}
              onClick={() => setRegion(encoded, r.name)}
              title={r.countries.map((c) => c.toUpperCase()).join(", ")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                value.region === encoded
                  ? "bg-gray-800 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {r.name}
              <span className={`ml-1 ${value.region === encoded ? "text-gray-300" : "text-gray-400"}`}>
                {r.countries.length}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setShowRegions(true)}
          title="Create or edit saved regions"
          className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5
                     text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <Settings2 size={12} /> Regions
        </button>
      </div>

      {showRegions && <RegionManagerModal onClose={() => setShowRegions(false)} />}

      {/* Active drill-down focus. Lives in the filter row rather than inside a
          card, so a narrowed dashboard can never look like the full one. */}
      {focus && (
        <>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 py-1 pl-3 pr-1.5">
            <span className="text-xs font-medium text-sky-800">
              <span className="font-normal text-sky-600">Focused:</span> {focus.label}
            </span>
            <button
              onClick={onClearFocus}
              className="rounded-full p-0.5 text-sky-500 transition-colors hover:bg-sky-100 hover:text-sky-800"
              aria-label="Clear focus filter"
            >
              <X size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function defaultFilters(): AnalyticsFilterState {
  const preset: DatePreset = "30d";
  return { preset, region: "all", ...presetToDates(preset) };
}
