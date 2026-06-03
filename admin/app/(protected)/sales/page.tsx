"use client";

import { useState } from "react";
import AnalyticsFilters, { defaultFilters, type AnalyticsFilterState } from "@/components/analytics-filters";
import SalesCustomersTab  from "@/components/sales-customers-tab";
import SalesOrdersTab     from "@/components/sales-orders-tab";
import SalesProductsTab   from "@/components/sales-products-tab";
import SalesFulfillmentTab from "@/components/sales-fulfillment-tab";

type Tab = "customers" | "orders" | "products" | "fulfillment";

const TABS: { key: Tab; label: string }[] = [
  { key: "customers",   label: "Customers" },
  { key: "orders",      label: "Orders" },
  { key: "products",    label: "Products" },
  { key: "fulfillment", label: "Fulfillment" },
];

export default function SalesPage() {
  const [filters, setFilters] = useState<AnalyticsFilterState>(defaultFilters);
  const [tab, setTab] = useState<Tab>("customers");

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Sales Data</h1>
        <p className="text-sm text-gray-500 mt-0.5">Deep-drill analytics · Excludes cancelled orders · USD</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3 mb-6">
        <AnalyticsFilters value={filters} onChange={setFilters} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-sky-600 text-sky-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "customers"   && <SalesCustomersTab   filters={filters} />}
      {tab === "orders"      && <SalesOrdersTab      filters={filters} />}
      {tab === "products"    && <SalesProductsTab    filters={filters} />}
      {tab === "fulfillment" && <SalesFulfillmentTab filters={filters} />}
    </div>
  );
}
