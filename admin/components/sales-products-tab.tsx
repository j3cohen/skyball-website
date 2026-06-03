"use client";

import { useEffect, useState } from "react";
import type { AnalyticsFilterState } from "./analytics-filters";

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
};

type SortKey = "revenue" | "units" | "orders" | "revPerUnit";

export default function SalesProductsTab({ filters }: { filters: AnalyticsFilterState }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total,    setTotal]    = useState(0);
  const [sort,     setSort]     = useState<SortKey>("revenue");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (filters.from) params.set("from", filters.from);
    if (filters.to)   params.set("to",   filters.to);
    if (filters.region !== "all") params.set("region", filters.region);

    fetch(`/api/admin/analytics/products?${params}`)
      .then((r) => r.json())
      .then((json) => {
        setProducts(json.products ?? []);
        setTotal(json.totalRevenue ?? 0);
        setError(null);
      })
      .catch(() => setError("Failed to load product data."))
      .finally(() => setLoading(false));
  }, [filters, sort]);

  const sortCols: { key: SortKey; label: string }[] = [
    { key: "revenue",   label: "Revenue" },
    { key: "units",     label: "Units" },
    { key: "orders",    label: "Orders" },
    { key: "revPerUnit",label: "Rev / Unit" },
  ];

  return (
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
                <tr key={p.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
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
  );
}
