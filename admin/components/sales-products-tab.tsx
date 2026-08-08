"use client";

import { useEffect, useState } from "react";
import { analyticsParams, type AnalyticsFilterState, type FocusState } from "./analytics-filters";
import { makeTarget, type DrillTarget } from "./drill-panel";
import { useDrillSync } from "@/lib/use-drill-sync";

function fmtMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

type Product = {
  name: string;
  revenue: number;
  units: number;
  orders: number;
  uniqueBuyers: number;
  revPerUnit: number;
  pctOfTotal: number;
  o: number[];
};

type SortKey = "revenue" | "units" | "orders" | "revPerUnit";

type Props = {
  filters: AnalyticsFilterState;
  focus: FocusState | null;
  onDrill: (t: DrillTarget) => void;
  drill: DrillTarget | null;
};

const NS = "products:";

export default function SalesProductsTab({ filters, focus, onDrill, drill }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [total,    setTotal]    = useState(0);
  const [sort,     setSort]     = useState<SortKey>("revenue");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/products?${analyticsParams(filters, focus, { sort })}`)
      .then((r) => r.json())
      .then((json) => {
        setProducts(json.products ?? []);
        setOrderIds(json.orderIds ?? []);
        setTotal(json.totalRevenue ?? 0);
        setError(null);
      })
      .catch(() => setError("Failed to load product data."))
      .finally(() => setLoading(false));
  }, [filters, focus, sort]);

  // Single construction site — click handlers and the reload refresh share it.
  const targets: Record<string, DrillTarget> = {};
  for (const p of products) {
    targets[`${NS}sku:${p.name}`] = {
      ...makeTarget(
        orderIds, p.o, p.name,
        `${p.units} units · ${p.orders} orders · ${fmtMoney(p.revenue)}`,
        { dim: "sku", val: p.name }
      ),
      key: `${NS}sku:${p.name}`,
    };
  }
  const open = (key: string) => { const t = targets[NS + key]; if (t) onDrill(t); };

  const sortCols: { key: SortKey; label: string }[] = [
    { key: "revenue",   label: "Revenue" },
    { key: "units",     label: "Units" },
    { key: "orders",    label: "Orders" },
    { key: "revPerUnit",label: "Rev / Unit" },
  ];

  return (
    <>
    <DrillSyncProducts target={drill} targets={targets} onDrill={onDrill} token={products} />
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-700">
          All Products
          {total > 0 && <span className="ml-2 font-normal text-gray-400">· {fmtMoney(total)} total revenue</span>}
        </h2>
        <div className="flex gap-1">
          {sortCols.map((c) => (
            <button
              key={c.key}
              onClick={() => setSort(c.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sort === c.key ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="p-6 space-y-2 animate-pulse">
          {[1,2,3,4,5].map(i => <div key={i} className="h-9 bg-gray-100 rounded" />)}
        </div>
      ) : error ? (
        <p className="px-5 py-8 text-sm text-red-600 text-center">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { h: "Product",       align: "left" },
                  { h: "Revenue",       align: "right" },
                  { h: "% of Total",    align: "right" },
                  { h: "Units",         align: "right" },
                  { h: "Orders",        align: "right" },
                  { h: "Unique Buyers", align: "right" },
                  { h: "Rev / Unit",    align: "right" },
                ].map(({ h, align }) => (
                  <th key={h} className={`px-5 py-3 font-medium text-gray-500 text-${align}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p, i) => (
                <tr
                  key={p.name}
                  onClick={() => open(`sku:${p.name}`)}
                  title="View contributing orders"
                  className={`cursor-pointer transition-colors hover:bg-sky-50/60 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                >
                  <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{fmtMoney(p.revenue)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-sky-400 rounded-full" style={{ width: `${p.pctOfTotal}%` }} />
                      </div>
                      <span className="text-gray-500 w-10 text-right">{p.pctOfTotal}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500">{p.units}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{p.orders}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{p.uniqueBuyers}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{fmtMoney(p.revPerUnit)}</td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">No product data for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}

/** Hooks can't run after the early returns above, so the sync lives in a child. */
function DrillSyncProducts({
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
