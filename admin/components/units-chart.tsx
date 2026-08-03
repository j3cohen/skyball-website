"use client";

// Stacked-bar trend of base units per period.
//
// Form: change-over-time with distinct series → stacked bar + categorical color.
// Series identity is the COMPONENT_ORDER slot, never the rank, so filtering the
// range can't repaint the surviving series. Legend is always present and the
// pivot tables below the chart are the table view — together they satisfy the
// relief rule for the three palette slots under 3:1 on a white surface.

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// Validated categorical palette (light mode, white surface).
// node scripts/validate_palette.js "…" --mode light --surface "#ffffff"
//   Lightness band PASS · chroma floor PASS · CVD separation PASS (worst
//   adjacent ΔE 9.1) · normal-vision floor PASS (worst adjacent ΔE 19.6) ·
//   contrast WARN → relief supplied by the legend + pivot tables.
const SERIES_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

const SURFACE = "#ffffff";

export type ChartSeries = { id: string; label: string; total: number };
export type ChartPeriod = { key: string; label: string };
export type PeriodKind = "day" | "week" | "month" | "quarter" | "year";

type Props = {
  periods: ChartPeriod[];
  series:  ChartSeries[];
  /** series id → { periodKey: value } */
  values:  Record<string, Record<string, number>>;
  period:  PeriodKind;
  /** Fixed ordering that owns the colour assignment (COMPONENT_ORDER). */
  colorOrder: string[];
  /** Drill into one period's bar. */
  onDrillPeriod?: (periodKey: string, label: string) => void;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Format a y-m-d triple without touching the local timezone. */
function fmtDay(y: number, m: number, d: number, withYear = false) {
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ""}`;
}

/**
 * The calendar span a bucket key covers, e.g. "Jul 12 – Jul 18, 2026".
 * Bucket keys are already Eastern-time calendar dates, so this is plain
 * arithmetic — converting through a Date in local time would shift them.
 */
export function periodRange(key: string, period: PeriodKind): string {
  if (period === "year") return `Jan 1 – Dec 31, ${key}`;

  if (period === "quarter") {
    const [y, q] = key.split("-Q");
    const start = (Number(q) - 1) * 3 + 1;
    const end = start + 2;
    const lastDay = new Date(Date.UTC(Number(y), end, 0)).getUTCDate();
    return `${fmtDay(Number(y), start, 1)} – ${fmtDay(Number(y), end, lastDay, true)}`;
  }

  const [ys, ms, ds] = key.split("-");
  const y = Number(ys), m = Number(ms);

  if (period === "month") {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${fmtDay(y, m, 1)} – ${fmtDay(y, m, lastDay, true)}`;
  }

  if (period === "day") return fmtDay(y, m, Number(ds), true);

  // Week: key is the Sunday; span is Sunday → Saturday.
  const start = new Date(Date.UTC(y, m - 1, Number(ds)));
  const end   = new Date(start.getTime() + 6 * 864e5);
  return `${fmtDay(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate())} – ${fmtDay(
    end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), true
  )}`;
}

type TooltipRow = { id: string; label: string; color: string; value: number };

function ChartTooltip({
  active, payload, label, period, seriesMeta,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  period: PeriodKind;
  seriesMeta: Map<string, { label: string; color: string }>;
}) {
  if (!active || !payload?.length) return null;

  const key = String(label ?? "");
  const rows: TooltipRow[] = payload
    .map((p) => {
      const meta = seriesMeta.get(String(p.dataKey));
      return {
        id: String(p.dataKey),
        label: meta?.label ?? String(p.dataKey),
        color: meta?.color ?? "#9ca3af",
        value: Number(p.value ?? 0),
      };
    })
    .filter((r) => r.value > 0)
    .reverse(); // top of the stack reads first

  const total = rows.reduce((s, r) => s + r.value, 0);
  const heading = payload[0]?.payload?.label ?? key;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-gray-900">{heading}</p>
      <p className="text-[11px] text-gray-400 mb-2">{periodRange(key, period)}</p>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No units</p>
      ) : (
        <table>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="pr-2 py-px align-middle">
                  {/* line key, not a filled box — a box is data-weight ink here */}
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 10, height: 2, backgroundColor: r.color }}
                  />
                </td>
                <td className="pr-3 py-px text-right text-xs font-semibold text-gray-900 tabular-nums">
                  {r.value.toLocaleString()}
                </td>
                <td className="py-px text-xs text-gray-500 whitespace-nowrap">{r.label}</td>
              </tr>
            ))}
            <tr>
              <td />
              <td className="pr-3 pt-1 text-right text-xs font-semibold text-gray-900 tabular-nums border-t border-gray-100">
                {total.toLocaleString()}
              </td>
              <td className="pt-1 text-xs text-gray-400 border-t border-gray-100">total</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function UnitsChart({
  periods, series, values, period, colorOrder, onDrillPeriod,
}: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Colour follows the entity: the slot comes from the fixed order, so hiding a
  // series or changing the date range never recolours the others.
  const colorFor = (id: string) =>
    SERIES_COLORS[Math.max(0, colorOrder.indexOf(id)) % SERIES_COLORS.length];

  const visible = series.filter((s) => !hidden.has(s.id));

  const seriesMeta = new Map(
    series.map((s) => [s.id, { label: s.label, color: colorFor(s.id) }])
  );

  const rows = periods.map((p) => {
    const row: Record<string, string | number> = { key: p.key, label: p.label };
    for (const s of series) row[s.id] = values[s.id]?.[p.key] ?? 0;
    return row;
  });

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      // Never let the reader hide every series — an empty chart looks broken.
      if (next.has(id)) next.delete(id);
      else if (visible.length > 1) next.add(id);
      return next;
    });
  }

  const allShown = hidden.size === 0;

  // "Hide all" keeps the largest series visible, for the same reason toggle()
  // refuses to empty the chart.
  function toggleAll() {
    if (allShown) {
      const keep = series.reduce((a, b) => (b.total > a.total ? b : a), series[0]);
      setHidden(new Set(series.filter((s) => s.id !== keep.id).map((s) => s.id)));
    } else {
      setHidden(new Set());
    }
  }

  if (periods.length === 0 || series.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <p className="px-5 py-12 text-center text-sm text-gray-400">
          No units to chart for this period.
        </p>
      </div>
    );
  }

  const dense = periods.length > 40;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">
          Base units over time
          <span className="ml-2 font-normal text-gray-400">
            · hover a bar for the breakdown{onDrillPeriod ? ", click it for the orders" : ""} ·
            click a legend item to show/hide it
          </span>
        </h2>
      </div>

      <div className="px-2 pt-4 pb-1">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={rows}
            margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
            onClick={(e: { activeLabel?: string | number }) => {
              const k = e?.activeLabel != null ? String(e.activeLabel) : null;
              if (!k || !onDrillPeriod) return;
              const row = rows.find((r) => r.key === k);
              onDrillPeriod(k, String(row?.label ?? k));
            }}
            style={onDrillPeriod ? { cursor: "pointer" } : undefined}
          >
            {/* recessive, solid hairline, horizontal only */}
            <CartesianGrid stroke="#f1f1f1" vertical={false} />
            <XAxis
              dataKey="key"
              tickFormatter={(k: string) =>
                rows.find((r) => r.key === k)?.label as string ?? k
              }
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              minTickGap={dense ? 40 : 12}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(n: number) => n.toLocaleString()}
              width={46}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.035)" }}
              content={
                <ChartTooltip period={period} seriesMeta={seriesMeta} />
              }
            />
            {visible.map((s, i) => (
              <Bar
                key={s.id}
                dataKey={s.id}
                stackId="units"
                fill={colorFor(s.id)}
                // A 2px stroke in the surface colour is the surface gap between
                // stacked segments — it reads as white space, not as a border.
                stroke={SURFACE}
                strokeWidth={2}
                maxBarSize={24}
                isAnimationActive={false}
                // 4px rounded data-end on the top of the stack only
                radius={i === visible.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — always present for ≥2 series; click to toggle */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 pb-4 pt-2">
        <button
          onClick={toggleAll}
          className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium
                     text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          {allShown ? "Hide all" : "Show all"}
        </button>
        <span className="h-3 w-px bg-gray-200" />
        {series.map((s) => {
          const off = hidden.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex items-center gap-1.5 text-xs transition-opacity ${
                off ? "opacity-35" : "opacity-100"
              }`}
              title={off ? `Show ${s.label}` : `Hide ${s.label}`}
            >
              <span
                className="inline-block rounded-sm shrink-0"
                style={{ width: 10, height: 10, backgroundColor: colorFor(s.id) }}
              />
              <span className="text-gray-600">{s.label}</span>
              <span className="text-gray-400 tabular-nums">{s.total.toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
