"use client";

export type DatePreset = "7d" | "30d" | "90d" | "mtd" | "lm" | "ytd" | "all";
export type RegionFilter = "all" | "domestic" | "international";

export type AnalyticsFilterState = {
  preset: DatePreset;
  region: RegionFilter | string; // RegionFilter or a country code
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
  }
}

type Props = {
  value: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
};

export default function AnalyticsFilters({ value, onChange }: Props) {
  function setPreset(preset: DatePreset) {
    const dates = presetToDates(preset);
    onChange({ ...value, preset, ...dates });
  }

  function setRegion(region: string) {
    onChange({ ...value, region });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date presets */}
      <div className="flex flex-wrap gap-1">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              value.preset === p.value
                ? "bg-sky-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-gray-200" />

      {/* Region selector */}
      <div className="flex gap-1">
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
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              value.region === r.value
                ? "bg-gray-800 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function defaultFilters(): AnalyticsFilterState {
  const preset: DatePreset = "30d";
  return { preset, region: "all", ...presetToDates(preset) };
}
