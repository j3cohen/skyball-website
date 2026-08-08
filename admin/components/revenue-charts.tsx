"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

function fmtMoney(cents: number) {
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

function fmtDate(dateStr: string) {
  // Bucket keys are UTC (dateKey uses toISOString), so format them in UTC too.
  // Without timeZone:"UTC", a browser west of UTC renders each bucket one
  // month/day early (e.g. the "2026-01" bucket shows as "Dec '25").
  if (dateStr.length === 7) {
    // YYYY-MM
    return new Date(dateStr + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

type TimePoint = {
  date: string; revenue: number; orders: number;
  days?: number; avgDaily?: number;
};

type RevenueChartProps = {
  data: TimePoint[];
  granularity: "day" | "week" | "month";
  /** Click a point/bar to drill into that bucket's orders. */
  onDrillDate?: (date: string) => void;
  /** Plot bucket totals, or revenue per day inside each bucket. */
  metric?: "revenue" | "avgDaily";
};

/** Shared click handler — recharts hands back the category under the pointer. */
function drillHandler(onDrillDate?: (date: string) => void) {
  if (!onDrillDate) return undefined;
  return (e: { activeLabel?: string | number }) => {
    if (e?.activeLabel != null) onDrillDate(String(e.activeLabel));
  };
}

export function RevenueAreaChart({ data, onDrillDate, metric = "revenue" }: RevenueChartProps) {
  const tickCount = data.length > 60 ? 8 : data.length > 30 ? 10 : undefined;
  const isAvg = metric === "avgDaily";
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={data}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        onClick={drillHandler(onDrillDate)}
        style={onDrillDate ? { cursor: "pointer" } : undefined}
      >
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickCount={tickCount}
          minTickGap={30}
        />
        <YAxis
          tickFormatter={fmtMoney}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          width={50}
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any, _n: any, item: any) => {
            const d = item?.payload?.days;
            return [
              `$${(Number(val) / 100).toFixed(2)}`,
              isAvg ? `Avg / day${d ? ` (${d} days)` : ""}` : "Revenue",
            ];
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(label: any) => fmtDate(String(label))}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Area
          type="monotone"
          dataKey={isAvg ? "avgDaily" : "revenue"}
          stroke="#0284c7"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function OrdersBarChart({
  data, onDrillDate,
}: { data: TimePoint[]; onDrillDate?: (date: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        onClick={drillHandler(onDrillDate)}
        style={onDrillDate ? { cursor: "pointer" } : undefined}
      >
        <CartesianGrid stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          minTickGap={30}
        />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={30} allowDecimals={false} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any) => [Number(val), "Orders"]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(label: any) => fmtDate(String(label))}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="orders" fill="#0ea5e9" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type BucketPoint = { label: string; count: number };

export function OrderValueBucketChart({
  data, onDrillBucket,
}: { data: BucketPoint[]; onDrillBucket?: (label: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        onClick={drillHandler(onDrillBucket)}
        style={onDrillBucket ? { cursor: "pointer" } : undefined}
      >
        <CartesianGrid stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={30} allowDecimals={false} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(val: any) => [Number(val), "Orders"]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
