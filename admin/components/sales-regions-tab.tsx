"use client";

// Sales by region.
//
// Regions are a client-side grouping, so this rolls up the per-country
// breakdowns the analytics routes already return rather than adding a new
// endpoint the server would have to know regions for. Those breakdowns carry
// order indices, so every region row stays drillable.

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  analyticsParams, type AnalyticsFilterState, type FocusState,
} from "./analytics-filters";
import DrillRow from "./drill-row";
import { makeTarget, type DrillTarget } from "./drill-panel";
import { useDrillSync } from "@/lib/use-drill-sync";
import { useRegions, encodeRegion, countryLabel } from "@/lib/regions";
import RegionManagerModal from "./region-manager-modal";
import { buildCsv, triggerCsvDownload } from "@/lib/csv-export";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

type CountryRow  = { country: string; cents: number; count: number; o: number[] };
type ShipRow     = { country: string; shippingCents: number; o: number[] };

type Props = {
  filters: AnalyticsFilterState;
  focus: FocusState | null;
  onDrill: (t: DrillTarget) => void;
  drill: DrillTarget | null;
  onSelectRegion: (encoded: string, name: string) => void;
};

const NS = "regions:";

type Row = {
  key: string;
  name: string;
  countries: string[];
  orders: number;
  cents: number;
  shippingCents: number;
  o: number[];
  saved: boolean;
};

export default function SalesRegionsTab({
  filters, focus, onDrill, drill, onSelectRegion,
}: Props) {
  const { regions } = useRegions();
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [shipping, setShipping]   = useState<ShipRow[]>([]);
  const [orderIds, setOrderIds]   = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Region rollups must ignore the region filter itself, or picking one region
    // would empty every other row. Date and focus still apply.
    const p = analyticsParams({ ...filters, region: "all" }, focus);
    Promise.all([
      fetch(`/api/admin/analytics/revenue?${p}`).then((r) => r.json()),
      fetch(`/api/admin/analytics/fulfillment?${p}`).then((r) => r.json()),
    ])
      .then(([rev, ful]) => {
        setCountries(rev.countryBreakdown ?? []);
        setOrderIds(rev.orderIds ?? []);
        // Fulfillment has its own id table, so map its shipping totals by
        // country code rather than trying to reuse its indices.
        setShipping(
          (ful.byCountry ?? []).map((r: { country: string; shippingCents: number; o: number[] }) => ({
            country: r.country, shippingCents: r.shippingCents, o: r.o,
          }))
        );
        setError(null);
      })
      .catch(() => setError("Failed to load region data."))
      .finally(() => setLoading(false));
  }, [filters, focus]);

  const byCode = new Map(countries.map((c) => [c.country.toUpperCase(), c]));
  const shipByCode = new Map(shipping.map((s) => [s.country.toUpperCase(), s.shippingCents]));

  function rollUp(name: string, codes: string[], key: string, saved: boolean): Row {
    const seen = new Set<number>();
    let orders = 0, cents = 0, shippingCents = 0;
    for (const raw of codes) {
      const c = byCode.get(raw.toUpperCase());
      shippingCents += shipByCode.get(raw.toUpperCase()) ?? 0;
      if (!c) continue;
      orders += c.count;
      cents  += c.cents;
      for (const i of c.o) seen.add(i);
    }
    return { key, name, countries: codes, orders, cents, shippingCents, o: [...seen], saved };
  }

  const savedRows = regions.map((r) => rollUp(r.name, r.countries, `saved:${r.id}`, true));

  // Anything not covered by a saved region, so the rows always add up.
  const claimed = new Set(regions.flatMap((r) => r.countries.map((c) => c.toUpperCase())));
  const unassigned = countries.map((c) => c.country.toUpperCase()).filter((c) => !claimed.has(c));
  const unassignedRow = rollUp("Unassigned", unassigned, "unassigned", false);

  const rows = [...savedRows.sort((a, b) => b.cents - a.cents)];
  if (unassigned.length > 0) rows.push(unassignedRow);

  const grandCents  = countries.reduce((s, c) => s + c.cents, 0);
  const grandOrders = countries.reduce((s, c) => s + c.count, 0);
  const maxCents    = Math.max(...rows.map((r) => r.cents), 1);

  // Drill targets, built once and reused by clicks and the reload refresh.
  const targets: Record<string, DrillTarget> = {};
  for (const r of rows) {
    targets[NS + r.key] = {
      ...makeTarget(
        orderIds, r.o, r.name,
        `${r.orders} orders · ${fmtMoney(r.cents)} · ${r.countries.length} countries`
      ),
      key: NS + r.key,
    };
  }
  const open = (key: string) => { const t = targets[NS + key]; if (t) onDrill(t); };

  function handleExport() {
    triggerCsvDownload(
      buildCsv(
        ["Region", "Countries", "Orders", "Revenue", "AOV", "Shipping cost", "% of revenue"],
        rows.map((r) => [
          r.name,
          r.countries.map((c) => c.toUpperCase()).join(" "),
          r.orders,
          (r.cents / 100).toFixed(2),
          (r.orders ? r.cents / r.orders / 100 : 0).toFixed(2),
          (r.shippingCents / 100).toFixed(2),
          grandCents ? ((r.cents / grandCents) * 100).toFixed(1) : "0",
        ])
      ),
      `skyball-regions-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-xl bg-gray-100" />
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }
  if (error) return <p className="p-6 text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <DrillSync target={drill} targets={targets} onDrill={onDrill} token={countries} />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Sales by Region</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Regions are saved on this device · totals ignore the region filter so every row stays comparable
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowManager(true)}
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5
                         text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Settings2 size={12} /> Manage regions
            </button>
            <button
              onClick={handleExport}
              disabled={rows.length === 0}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium
                         text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>
        </div>

        {regions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-500">No regions yet.</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-400">
              Group countries into a region — EMEA, APAC, Nordics — then filter the whole dashboard to it
              in one click.
            </p>
            <button
              onClick={() => setShowManager(true)}
              className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white
                         transition-colors hover:bg-sky-700"
            >
              Create your first region
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rows.map((r) => (
              <DrillRow
                key={r.key}
                count={r.o.length}
                onDrill={() => open(r.key)}
                className="px-5 py-3"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:flex-nowrap">
                  <div className="min-w-0 sm:w-44">
                    <p className={`truncate text-sm font-medium ${r.saved ? "text-gray-900" : "text-gray-500"}`}>
                      {r.name}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {r.countries.length} countr{r.countries.length === 1 ? "y" : "ies"}
                      {r.countries.length <= 4 && r.countries.length > 0 &&
                        ` · ${r.countries.map((c) => c.toUpperCase()).join(", ")}`}
                    </p>
                  </div>
                  <div className="order-last basis-full overflow-hidden rounded-full bg-gray-100 sm:order-none sm:basis-auto sm:flex-1">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${Math.round((r.cents / maxCents) * 100)}%` }}
                    />
                  </div>
                  <span className="ml-auto text-xs tabular-nums text-gray-500 sm:ml-0 sm:w-16 sm:text-right">
                    {r.orders} orders
                  </span>
                  <span className="text-sm font-medium tabular-nums text-gray-800 sm:w-24 sm:text-right">
                    {fmtMoney(r.cents)}
                  </span>
                  <span className="whitespace-nowrap text-xs tabular-nums text-gray-400 sm:w-28 sm:text-right">
                    AOV {fmtMoney(r.orders ? Math.round(r.cents / r.orders) : 0)}
                  </span>
                  <span className="text-xs tabular-nums text-gray-400 sm:w-14 sm:text-right">
                    {grandCents ? Math.round((r.cents / grandCents) * 100) : 0}%
                  </span>
                </div>

                {r.saved && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onSelectRegion(encodeRegion(r.countries), r.name); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onSelectRegion(encodeRegion(r.countries), r.name);
                      }
                    }}
                    className="mt-1 inline-block cursor-pointer text-xs text-sky-600 hover:underline"
                  >
                    View dashboard for {r.name} →
                  </span>
                )}
              </DrillRow>
            ))}

            <div className="flex flex-wrap items-center gap-x-4 bg-gray-50/60 px-5 py-3 text-sm">
              <span className="sm:w-44 font-semibold text-gray-700">Total</span>
              <span className="flex-1" />
              <span className="text-xs tabular-nums text-gray-500 sm:w-16 sm:text-right">{grandOrders} orders</span>
              <span className="font-semibold tabular-nums text-gray-900 sm:w-24 sm:text-right">{fmtMoney(grandCents)}</span>
              <span className="sm:w-28" />
              <span className="sm:w-14" />
            </div>
          </div>
        )}
      </div>

      {/* Countries with no region, so gaps are obvious rather than hidden */}
      {regions.length > 0 && unassigned.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p className="mb-1 font-semibold">
            {unassigned.length} countr{unassigned.length === 1 ? "y is" : "ies are"} not in any region
            — {fmtMoney(unassignedRow.cents)} of revenue
          </p>
          <p className="text-amber-700">
            {unassigned.slice(0, 14).map((c) => countryLabel(c)).join(" · ")}
            {unassigned.length > 14 && ` +${unassigned.length - 14} more`}
          </p>
        </div>
      )}

      {showManager && <RegionManagerModal onClose={() => setShowManager(false)} />}
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
