"use client";

import { useState }                         from "react";
import { X }                                from "lucide-react";
import { classifyBoxSize }                  from "@/lib/box-size";
import type { BoxDimensions, BoxResult }    from "@/lib/box-size";
import { buildCsvString, triggerCsvDownload } from "@/lib/csv-export";
import type { ExportableOrder, OrderData, ShippingAddress } from "@/lib/order-types";

type Props = {
  orders:  ExportableOrder[];
  onClose: () => void;
};

type Classified = {
  order:  ExportableOrder;
  result: BoxResult;
};

function getItems(order: ExportableOrder) {
  return ((order.order_data as OrderData | null)?.items) ?? [];
}

function getAddr(order: ExportableOrder): ShippingAddress | null {
  return (order.shipping_address as ShippingAddress | null) ?? null;
}

export default function ShippingExportModal({ orders, onClose }: Props) {
  const classified: Classified[] = orders.map(order => ({
    order,
    result: classifyBoxSize(getItems(order)),
  }));

  const needsInput = classified.filter(c => c.result.kind === "needs-input");

  const [manualDims, setManualDims] = useState<Record<string, Partial<BoxDimensions>>>(
    Object.fromEntries(needsInput.map(c => [c.order.id, {}]))
  );

  const updateDim = (id: string, field: keyof BoxDimensions, raw: string) => {
    const n = parseFloat(raw);
    setManualDims(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: isNaN(n) ? undefined : n },
    }));
  };

  const allFilled = needsInput.every(({ order }) => {
    const d = manualDims[order.id];
    return d && d.length != null && d.width != null && d.height != null
              && d.pounds != null && d.ounces != null;
  });

  const handleDownload = () => {
    const rows = classified.map(({ order, result }) => {
      const addr = getAddr(order);
      const box: BoxDimensions = result.kind === "needs-input"
        ? {
            length: manualDims[order.id]?.length ?? 0,
            width:  manualDims[order.id]?.width  ?? 0,
            height: manualDims[order.id]?.height ?? 0,
            pounds: manualDims[order.id]?.pounds ?? 0,
            ounces: manualDims[order.id]?.ounces ?? 0,
          }
        : result.box;

      return {
        customer_name:  order.customer_name,
        customer_email: order.customer_email,
        address_line1:  addr?.line1,
        address_line2:  addr?.line2,
        city:           addr?.city,
        state:          addr?.state,
        zip:            addr?.postal_code,
        country:        addr?.country,
        ...box,
      };
    });

    const csv  = buildCsvString(rows);
    const date = new Date().toISOString().slice(0, 10);
    triggerCsvDownload(csv, `shipping-labels-${date}.csv`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export Shipping Labels</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {orders.length} order{orders.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-3 flex-1">
          {classified.map(({ order, result }) => (
            <div
              key={order.id}
              className={`rounded-lg border p-4 ${
                result.kind === "needs-input"
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {order.customer_name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {order.order_summary ?? "No summary"}
                  </p>
                </div>

                {result.kind !== "needs-input" && (
                  <span className="shrink-0 text-xs bg-sky-100 text-sky-800 rounded-full px-2.5 py-1 font-medium">
                    {result.box.length}×{result.box.width}×{result.box.height}&quot; &middot;{" "}
                    {result.box.pounds}lb {result.box.ounces}oz
                  </span>
                )}
              </div>

              {result.kind === "needs-input" && (
                <>
                  <p className="text-xs font-medium text-amber-800 mt-3 mb-2">
                    Large order — enter dimensions manually:
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {(["length", "width", "height", "pounds", "ounces"] as const).map(field => (
                      <div key={field}>
                        <label className="block text-xs text-gray-500 mb-0.5 capitalize">
                          {field}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={manualDims[order.id]?.[field] ?? ""}
                          onChange={e => updateDim(order.id, field, e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm
                                     focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!allFilled}
            className="px-4 py-2 text-sm font-medium bg-sky-600 text-white rounded-lg
                       hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
