"use client";

import { useEffect, useState } from "react";
import { analyticsParams, type AnalyticsFilterState, type FocusState } from "./analytics-filters";
import DrillRow from "./drill-row";
import { makeTarget, type DrillTarget } from "./drill-panel";
import { useDrillSync } from "@/lib/use-drill-sync";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Idx = number[];

type Stats = {
  totalCustomers: number;
  repeatCustomers: number;
  repeatPct: number;
  avgDaysBetweenOrders: number | null;
  sameAddressPct: number | null;
  diffAddressPct: number | null;
  repeatAvgSpendCents: number;
  oneTimeAvgSpendCents: number;
  o: {
    allCustomers: Idx; repeat: Idx; oneTime: Idx; sameAddress: Idx; diffAddress: Idx;
  };
};

type LeaderboardRow = {
  email: string;
  name: string | null;
  orderCount: number;
  totalSpentCents: number;
  firstOrder: string;
  lastOrder: string;
  o: Idx;
};

type Segment = { label: string; count: number; o: Idx };
type Item    = { name: string; purchases: number; o: Idx };

type Data = {
  stats: Stats;
  leaderboard: LeaderboardRow[];
  repeatItemBreakdown: Item[];
  segments: Segment[];
  orderIds: string[];
};

type Props = {
  filters: AnalyticsFilterState;
  focus: FocusState | null;
  onDrill: (t: DrillTarget) => void;
  drill: DrillTarget | null;
};

const NS = "customers:";

export default function SalesCustomersTab({ filters, focus, onDrill, drill }: Props) {
  const [data, setData]       = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/customers?${analyticsParams(filters, focus)}`)
      .then((r) => r.json())
      .then((json) => { setData(json); setError(null); })
      .catch(() => setError("Failed to load customer data."))
      .finally(() => setLoading(false));
  }, [filters, focus]);

  if (loading) return <LoadingSkeleton />;
  if (error)   return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!data)   return null;

  const { stats, leaderboard, repeatItemBreakdown, segments, orderIds } = data;
  const maxPurchases = repeatItemBreakdown[0]?.purchases ?? 1;

  // Single construction site — click handlers and the reload refresh share it.
  const targets: Record<string, DrillTarget> = {};
  const add = (
    key: string, idx: Idx, title: string, subtitle?: string,
    focusDim?: string, focusVal?: string
  ) => {
    targets[NS + key] = {
      ...makeTarget(
        orderIds, idx, title, subtitle,
        focusDim && focusVal ? { dim: focusDim as never, val: focusVal } : undefined
      ),
      key: NS + key,
    };
  };
  const open = (key: string) => { const t = targets[NS + key]; if (t) onDrill(t); };

  add("kpi:all",    stats.o.allCustomers, "All customers",       `${stats.totalCustomers} customers`);
  add("kpi:repeat", stats.o.repeat,       "Repeat buyers",       `${stats.repeatCustomers} customers`);
  add("addr:same",  stats.o.sameAddress,  "Same address",        `Buying for themselves · ${stats.o.sameAddress.length} orders`);
  add("addr:diff",  stats.o.diffAddress,  "Different address",   `Likely gifting · ${stats.o.diffAddress.length} orders`);
  for (const s2 of segments) add(`segment:${s2.label}`, s2.o, `Segment: ${s2.label}`, `${s2.count} customers · ${s2.o.length} orders`);
  for (const it of repeatItemBreakdown) add(`product:${it.name}`, it.o, it.name, `${it.purchases} units across ${it.o.length} repeat-buyer orders`, "sku", it.name);
  for (const row of leaderboard) add(`customer:${row.email}`, row.o, row.name ?? row.email, `${row.orderCount} orders · ${fmtMoney(row.totalSpentCents)}`, "customerEmail", row.email);

  return (
    <div className="space-y-6">
      <DrillSync target={drill} targets={targets} onDrill={onDrill} token={data} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Customers" value={String(stats.totalCustomers)}
          count={stats.o.allCustomers.length}
          onDrill={() => open("kpi:all")}
        />
        <KpiCard
          label="Repeat Buyers" value={String(stats.repeatCustomers)} sub={`${stats.repeatPct}% of total`}
          count={stats.o.repeat.length}
          onDrill={() => open("kpi:repeat")}
        />
        <KpiCard
          label="Avg Days Between Orders"
          value={stats.avgDaysBetweenOrders != null ? `${stats.avgDaysBetweenOrders}d` : "—"}
          sub="Repeat buyers only"
          count={stats.o.repeat.length}
          onDrill={() => open("kpi:repeat")}
        />
        <KpiCard
          label="Repeat Buyer AOV" value={fmtMoney(stats.repeatAvgSpendCents)}
          sub={`vs ${fmtMoney(stats.oneTimeAvgSpendCents)} one-time`}
          count={stats.o.repeat.length}
          onDrill={() => open("kpi:repeat")}
        />
      </div>

      {/* Gifting vs self-buy + segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Shipping Address Analysis <span className="font-normal">(repeat buyers)</span>
          </p>
          <div className="space-y-1">
            {[
              { label: "Same address", value: stats.sameAddressPct, desc: "Buying for themselves", color: "bg-sky-500", o: stats.o.sameAddress },
              { label: "Different address", value: stats.diffAddressPct, desc: "Likely gifting", color: "bg-violet-500", o: stats.o.diffAddress },
            ].map(({ label, value, desc, color, o }) => (
              <DrillRow
                key={label}
                count={o.length}
                onDrill={() => open(label === "Same address" ? "addr:same" : "addr:diff")}
                className="rounded-lg px-2 py-1.5 -mx-2"
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-gray-500">{value != null ? `${value}%` : "—"} — {desc}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${value ?? 0}%` }} />
                </div>
              </DrillRow>
            ))}
          </div>
        </div>

        {/* Segments */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer Segments</p>
          <div className="grid grid-cols-2 gap-3">
            {segments.map((s) => (
              <DrillRow
                key={s.label}
                count={s.o.length}
                onDrill={() => open(`segment:${s.label}`)}
                className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-center"
              >
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </DrillRow>
            ))}
          </div>
        </div>
      </div>

      {/* Items bought by repeat customers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Products Purchased by Repeat Buyers</h2>
        </div>
        {repeatItemBreakdown.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No repeat buyer purchases in this period.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {repeatItemBreakdown.map(({ name, purchases, o }) => (
              <DrillRow
                key={name}
                count={o.length}
                onDrill={() => open(`product:${name}`)}
                className="px-5 py-2.5"
              >
                <div className="flex items-center gap-4">
                  <span className="w-1/2 text-sm text-gray-800 font-medium truncate">{name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${Math.round((purchases / maxPurchases) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-gray-500">{purchases} units</span>
                </div>
              </DrillRow>
            ))}
          </div>
        )}
      </div>

      {/* Customer leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Customer Leaderboard</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["#", "Email / Name", "Orders", "Total Spent", "First Order", "Last Order"].map((h) => (
                  <th key={h} className={`px-4 py-3 font-medium text-gray-500 text-${["#", "Orders", "Total Spent"].includes(h) ? "right" : "left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaderboard.map((row, i) => (
                <tr
                  key={row.email}
                  onClick={() => open(`customer:${row.email}`)}
                  title="View this customer's orders"
                  className={`cursor-pointer transition-colors hover:bg-sky-50/60 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                >
                  <td className="px-4 py-2.5 text-right text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{row.email}</p>
                    {row.name && <p className="text-xs text-gray-400">{row.name}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.orderCount >= 4 ? "bg-sky-100 text-sky-700"
                        : row.orderCount >= 2 ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {row.orderCount}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-800 tabular-nums">{fmtMoney(row.totalSpentCents)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(row.firstOrder)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(row.lastOrder)}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Hooks can't run after the early returns above, so the sync lives in a child. */
function DrillSync({
  target, targets, onDrill, token,
}: {
  target: DrillTarget | null;
  targets: Record<string, DrillTarget>;
  onDrill: (t: DrillTarget) => void;
  token: unknown;
}) {
  useDrillSync({ target, targets, namespace: NS, onDrill, dataToken: token });
  return null;
}

function KpiCard({
  label, value, sub, onDrill, count,
}: {
  label: string; value: string; sub?: string; onDrill?: () => void; count?: number;
}) {
  return (
    <DrillRow
      onDrill={onDrill}
      count={count}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4"
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </DrillRow>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="h-48 bg-gray-100 rounded-xl" />
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );
}
