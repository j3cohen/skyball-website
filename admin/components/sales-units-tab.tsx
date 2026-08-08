"use client";

import { useEffect, useState } from "react";
import { analyticsParams, type AnalyticsFilterState, type FocusState } from "./analytics-filters";
import { buildCsv, triggerCsvDownload } from "@/lib/csv-export";
import UnitsChart from "@/components/units-chart";
import { makeTarget, type DrillTarget } from "@/components/drill-panel";
import { useDrillSync } from "@/lib/use-drill-sync";

type PeriodOption = "day" | "week" | "month" | "quarter" | "year";

const PERIODS: { value: PeriodOption; label: string }[] = [
  { value: "day",     label: "Daily" },
  { value: "week",    label: "Weekly" },
  { value: "month",   label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year",    label: "Yearly" },
];

// Fixed identity order that owns colour assignment in the chart — mirrors
// COMPONENT_ORDER in lib/product-bom.ts. Kept here so the client bundle doesn't
// pull in the whole BOM module just for an array of ids.
const COMPONENT_COLOR_ORDER = [
  "racket_pro", "racket_starter", "racket_original",
  "net", "ball", "grip", "racket_cover", "crewneck",
];

type PeriodCol = { key: string; label: string };
type ByPeriod  = Record<string, number>;
type Idx       = number[];

type UnitsData = {
  period:     PeriodOption;
  periods:    PeriodCol[];
  orderCount: number;
  skus:       { name: string; total: number; byPeriod: ByPeriod; revenue: number; revenueByPeriod: ByPeriod; o: Idx }[];
  components: {
    id: string; label: string; total: number; byPeriod: ByPeriod; o: Idx;
    sources: { name: string; units: number; orders: number; o: Idx }[];
  }[];
  ballPacks:  { size: number; label: string; total: number; byPeriod: ByPeriod; o: Idx }[];
  unmapped:   { name: string; units: number; byPeriod: ByPeriod; o: Idx }[];
  inferred:   { name: string; units: number }[];
  byPeriodOrders: Record<string, Idx>;
  orderIds:   string[];
};

const EMPTY: UnitsData = {
  period: "month", periods: [], orderCount: 0,
  skus: [], components: [], ballPacks: [], unmapped: [], inferred: [],
  byPeriodOrders: {}, orderIds: [],
};

type Props = {
  filters: AnalyticsFilterState;
  focus: FocusState | null;
  onDrill: (t: DrillTarget) => void;
  drill: DrillTarget | null;
};

const NS = "units:";

export default function SalesUnitsTab({ filters, focus, onDrill, drill }: Props) {
  const [period,  setPeriod]  = useState<PeriodOption>("month");
  const [data,    setData]    = useState<UnitsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [showInferred, setShowInferred] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/units?${analyticsParams(filters, focus, { period })}`)
      .then((r) => r.json())
      .then((json: UnitsData & { error?: string }) => {
        if (json.error) throw new Error(json.error);
        setData(json);
        setError(null);
      })
      .catch(() => setError("Failed to load units data."))
      .finally(() => setLoading(false));
  }, [filters, focus, period]);

  const cols = data.periods;

  // Single construction site — click handlers and the reload refresh share it.
  const targets: Record<string, DrillTarget> = {};
  const add = (
    key: string, idx: Idx, title: string, subtitle?: string,
    focusDim?: string, focusVal?: string, extra?: Partial<DrillTarget>
  ) => {
    targets[NS + key] = {
      ...makeTarget(
        data.orderIds, idx, title, subtitle,
        focusDim && focusVal ? { dim: focusDim as never, val: focusVal } : undefined
      ),
      key: NS + key,
      ...extra,
    };
  };
  const open = (key: string) => { const t = targets[NS + key]; if (t) onDrill(t); };

  for (const s of data.skus) add(`sku:${s.name}`, s.o, s.name, `${s.total} units sold`, "sku", s.name);
  for (const c of data.components) {
    // A base unit also shows which products produced it.
    add(`component:${c.id}`, c.o, c.label, `${c.total} base units`, "component", c.id, {
      breakdownTitle: "Came from",
      breakdown: c.sources.map((src) => ({
        name: src.name,
        value: src.units,
        valueLabel: "units",
        orders: src.orders,
        orderIds: src.o.map((i) => data.orderIds[i]).filter(Boolean),
      })),
    });
  }
  for (const p2 of data.ballPacks) add(`pack:${p2.size}`, p2.o, p2.label, `${p2.total} packs`);
  for (const u of data.unmapped) add(`unmapped:${u.name}`, u.o, u.name, `${u.units} unmapped unit${u.units !== 1 ? "s" : ""}`);
  for (const col of cols) add(`period:${col.key}`, data.byPeriodOrders[col.key] ?? [], col.label, `Orders in ${col.label}`);

  function handleExport() {
    const headers = ["Section", "Item", ...cols.map((c) => c.label), "Total"];
    const row = (section: string, label: string, byPeriod: ByPeriod, total: number) =>
      [section, label, ...cols.map((c) => byPeriod[c.key] ?? 0), total];

    const rows: (string | number)[][] = [
      ...data.skus.map((s) => row("Sold as", s.name, s.byPeriod, s.total)),
      ...data.components.map((c) => row("Base units", c.label, c.byPeriod, c.total)),
      ...data.ballPacks.map((p) => row("Base units", `  ${p.label}`, p.byPeriod, p.total)),
      ...data.unmapped.map((u) => row("Unmapped", u.name, u.byPeriod, u.units)),
    ];

    triggerCsvDownload(
      buildCsv(headers, rows),
      `skyball-units-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <p className="px-5 py-8 text-sm text-red-600 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DrillSync target={drill} targets={targets} onDrill={onDrill} token={data} />

      {/* Period selector + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-sky-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium
                     text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Unmapped warning */}
      {data.unmapped.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">
            ⚠ {data.unmapped.length} product name{data.unmapped.length !== 1 ? "s" : ""} could not be
            broken into base units — these count in &ldquo;Sold as&rdquo; but not in &ldquo;Base units&rdquo;:
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            {data.unmapped.map((u) => (
              <li key={u.name}>
                <button
                  onClick={() => open(`unmapped:${u.name}`)}
                  className="underline decoration-amber-300 underline-offset-2 hover:text-amber-950"
                >
                  {u.name} — {u.units} unit{u.units !== 1 ? "s" : ""}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-amber-700">
            Add them to <code className="font-mono">BOM_OVERRIDES</code> in{" "}
            <code className="font-mono">admin/lib/product-bom.ts</code> to include them.
          </p>
        </div>
      )}

      {/* Density hint — daily over a long range makes the tables unwieldy */}
      {cols.length > 90 && (
        <p className="text-xs text-gray-400">
          Showing {cols.length} periods. Narrow the date range above for a more readable table.
        </p>
      )}

      <UnitsChart
        periods={cols}
        series={data.components.map((c) => ({ id: c.id, label: c.label, total: c.total }))}
        values={Object.fromEntries(data.components.map((c) => [c.id, c.byPeriod]))}
        period={period}
        colorOrder={COMPONENT_COLOR_ORDER}
        onDrillPeriod={(key) => open(`period:${key}`)}
      />

      <PivotTable
        title="Sold as"
        subtitle={`${data.orderCount} order${data.orderCount !== 1 ? "s" : ""} · what shipped as a SKU`}
        cols={cols}
        rows={data.skus.map((s) => ({
          key: s.name, label: s.name, byPeriod: s.byPeriod, total: s.total,
          onDrill: () => open(`sku:${s.name}`),
        }))}
        emptyText="No product sales in this period."
      />

      <PivotTable
        title="Base units"
        subtitle="every SKU exploded into what's physically inside it"
        cols={cols}
        rows={[
          ...data.components.map((c) => ({
            key: c.id, label: c.label, byPeriod: c.byPeriod, total: c.total,
            onDrill: () => open(`component:${c.id}`),
          })),
          ...data.ballPacks.map((p) => ({
            key: `pack-${p.size}`, label: p.label, byPeriod: p.byPeriod, total: p.total, sub: true,
            onDrill: () => open(`pack:${p.size}`),
          })),
        ]}
        emptyText="No base units in this period."
        footer={
          data.inferred.length > 0 ? (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
              <button
                onClick={() => setShowInferred((v) => !v)}
                className="hover:text-gray-700 transition-colors"
              >
                {showInferred ? "▾" : "▸"} {data.inferred.length} custom item
                {data.inferred.length !== 1 ? "s" : ""} decomposed by reading their name
              </button>
              {showInferred && (
                <ul className="mt-2 space-y-0.5 list-disc list-inside text-gray-400">
                  {data.inferred.map((i) => (
                    <li key={i.name}>{i.name} — {i.units} unit{i.units !== 1 ? "s" : ""}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : null
        }
      />
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

// ── Pivot table ────────────────────────────────────────────────────────────

type PivotRow = {
  key: string; label: string; byPeriod: ByPeriod; total: number;
  sub?: boolean; onDrill?: () => void;
};

function PivotTable({
  title, subtitle, cols, rows, emptyText, footer,
}: {
  title: string;
  subtitle: string;
  cols: PeriodCol[];
  rows: PivotRow[];
  emptyText: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">
          {title}
          <span className="ml-2 font-normal text-gray-400">· {subtitle}</span>
        </h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 text-left sticky left-0 bg-gray-50">
                  Item
                </th>
                {cols.map((c) => (
                  <th key={c.key} className="px-4 py-3 font-medium text-gray-500 text-right whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="px-5 py-3 font-medium text-gray-700 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr
                  key={r.key}
                  onClick={r.onDrill}
                  title={r.onDrill ? "View contributing orders" : undefined}
                  className={`${r.onDrill ? "cursor-pointer hover:bg-sky-50/60 transition-colors" : ""} ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                  }`}
                >
                  <td
                    className={`px-5 py-3 sticky left-0 whitespace-nowrap ${
                      r.sub ? "text-gray-400 text-xs pl-9" : "font-medium text-gray-900"
                    } ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                  >
                    {r.sub ? `· ${r.label}` : r.label}
                  </td>
                  {cols.map((c) => {
                    const n = r.byPeriod[c.key] ?? 0;
                    return (
                      <td
                        key={c.key}
                        className={`px-4 py-3 text-right tabular-nums ${
                          n === 0 ? "text-gray-300" : r.sub ? "text-gray-400 text-xs" : "text-gray-600"
                        }`}
                      >
                        {n === 0 ? "—" : n.toLocaleString()}
                      </td>
                    );
                  })}
                  <td
                    className={`px-5 py-3 text-right tabular-nums ${
                      r.sub ? "text-gray-400 text-xs" : "font-semibold text-gray-900"
                    }`}
                  >
                    {r.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer}
    </div>
  );
}
