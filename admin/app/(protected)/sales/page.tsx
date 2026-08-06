"use client";

import { useState } from "react";
import AnalyticsFilters, {
  defaultFilters,
  type AnalyticsFilterState,
  type FocusState,
} from "@/components/analytics-filters";
import DrillPanel, { type DrillTarget } from "@/components/drill-panel";
import SalesCustomersTab  from "@/components/sales-customers-tab";
import SalesOrdersTab     from "@/components/sales-orders-tab";
import SalesProductsTab   from "@/components/sales-products-tab";
import SalesUnitsTab      from "@/components/sales-units-tab";
import SalesFulfillmentTab from "@/components/sales-fulfillment-tab";
import SalesRegionsTab     from "@/components/sales-regions-tab";

type Tab = "customers" | "orders" | "products" | "units" | "fulfillment" | "regions";

const TABS: { key: Tab; label: string }[] = [
  { key: "customers",   label: "Customers" },
  { key: "orders",      label: "Orders" },
  { key: "products",    label: "Products" },
  { key: "units",       label: "Units Sold" },
  { key: "fulfillment", label: "Fulfillment" },
  { key: "regions",     label: "Regions" },
];

export default function SalesPage() {
  const [filters, setFilters] = useState<AnalyticsFilterState>(defaultFilters);
  const [tab, setTab] = useState<Tab>("customers");

  // Drill-down target (the drawer) and the focus chip promoted from one.
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const [focus, setFocus] = useState<FocusState | null>(null);

  // `drill` goes down too: each tab refreshes the open panel from its own
  // freshly-loaded data when the date range changes.
  const tabProps = { filters, focus, onDrill: setDrill, drill };

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Sales Data</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Deep-drill analytics · Excludes cancelled orders · USD · Click any row for its orders
        </p>
      </div>

      {/* Filter bar — scopes every tab below it */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3 mb-6">
        <AnalyticsFilters
          value={filters}
          onChange={setFilters}
          focus={focus}
          onClearFocus={() => setFocus(null)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
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
      {tab === "customers"   && <SalesCustomersTab   {...tabProps} />}
      {tab === "orders"      && <SalesOrdersTab      {...tabProps} />}
      {tab === "products"    && <SalesProductsTab    {...tabProps} />}
      {tab === "units"       && <SalesUnitsTab       {...tabProps} />}
      {tab === "fulfillment" && <SalesFulfillmentTab {...tabProps} />}
      {tab === "regions"     && (
        <SalesRegionsTab
          {...tabProps}
          onSelectRegion={(region, regionName) => setFilters((f) => ({ ...f, region, regionName }))}
        />
      )}

      <DrillPanel
        target={drill}
        onClose={() => setDrill(null)}
        onApplyFocus={(f, label) => setFocus({ dim: f.dim, val: f.val, label })}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
