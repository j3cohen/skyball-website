"use client";

import { useState }                         from "react";
import { X, ChevronUp, Pencil } from "lucide-react";
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

const DIM_FIELDS = ["length", "width", "height", "pounds", "ounces"] as const;

function getItems(order: ExportableOrder) {
  return ((order.order_data as OrderData | null)?.items) ?? [];
}

function getAddr(order: ExportableOrder): ShippingAddress | null {
  return (order.shipping_address as ShippingAddress | null) ?? null;
}

function dimsFilled(d: Partial<BoxDimensions> | undefined): boolean {
  if (!d) return false;
  return DIM_FIELDS.every(f => d[f] != null);
}

export default function ShippingExportModal({ orders, onClose }: Props) {
  const classified: Classified[] = orders.map(order => ({
    order,
    result: classifyBoxSize(getItems(order)),
  }));

  // All orders get an override entry.
  // Auto-classified: pre-filled with detected box values.
  // Needs-input: empty (user must fill before download is enabled).
  const [overrideDims, setOverrideDims] = useState<Record<string, Partial<BoxDimensions>>>(
    Object.fromEntries(
      classified.map(({ order, result }) => [
        order.id,
        result.kind !== "needs-input" ? { ...result.box } : {},
      ])
    )
  );

  // Needs-input cards start expanded; auto-classified start collapsed.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(classified.filter(c => c.result.kind === "needs-input").map(c => c.order.id))
  );

  const updateDim = (id: string, field: keyof BoxDimensions, raw: string) => {
    const n = parseFloat(raw);
    setOverrideDims(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: isNaN(n) ? undefined : n },
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Download is only blocked if a needs-input order has unfilled dims.
  const needsInput = classified.filter(c => c.result.kind === "needs-input");
  const allFilled = needsInput.every(({ order }) => dimsFilled(overrideDims[order.id]));

  const handleDownload = () => {
    const rows = classified.map(({ order, result }) => {
      const addr = getAddr(order);
      const override = overrideDims[order.id];

      const box: BoxDimensions = result.kind !== "needs-input"
        ? {
            length: override?.length ?? result.box.length,
            width:  override?.width  ?? result.box.width,
            height: override?.height ?? result.box.height,
            pounds: override?.pounds ?? result.box.pounds,
            ounces: override?.ounces ?? result.box.ounces,
          }
        : {
            length: override?.length ?? 0,
            width:  override?.width  ?? 0,
            height: override?.height ?? 0,
            pounds: override?.pounds ?? 0,
            ounces: override?.ounces ?? 0,
          };

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
              {" · "}Click any label to edit its dimensions before export.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-3 flex-1">
          {classified.map(({ order, result }) => {
            const isNeedsInput = result.kind === "needs-input";
            const isExpanded   = expandedIds.has(order.id);
            const dims         = overrideDims[order.id];
            const detectedBox  = !isNeedsInput ? (result as { kind: "large" | "small"; box: BoxDimensions }).box : null;
            const isEdited     = detectedBox && dims
              ? DIM_FIELDS.some(f => dims[f] !== detectedBox[f])
              : false;

            return (
              <div
                key={order.id}
                className={`rounded-lg border transition-colors ${
                  isNeedsInput
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                {/* Card header — always visible, clickable to expand */}
                <button
                  type="button"
                  onClick={() => toggleExpand(order.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {order.customer_name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {order.order_summary ?? "No summary"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isNeedsInput ? (
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">
                        Needs input
                      </span>
                    ) : (
                      <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${
                        isEdited
                          ? "bg-sky-100 text-sky-800"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {isEdited ? "✎ " : ""}
                        {dims?.length ?? result.box.length}×{dims?.width ?? result.box.width}×{dims?.height ?? result.box.height}&quot;
                        {" · "}
                        {dims?.pounds ?? result.box.pounds}lb {dims?.ounces ?? result.box.ounces}oz
                      </span>
                    )}
                    {isNeedsInput ? null : isExpanded
                      ? <ChevronUp size={16} className="text-gray-400" />
                      : <Pencil size={14} className="text-gray-400" />
                    }
                  </div>
                </button>

                {/* Expandable dimension editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 pt-3">
                    {isNeedsInput && (
                      <p className="text-xs font-medium text-amber-800 mb-2">
                        Large or unusual order — enter dimensions manually:
                      </p>
                    )}
                    <div className="grid grid-cols-5 gap-2">
                      {DIM_FIELDS.map(field => (
                        <div key={field}>
                          <label className="block text-xs text-gray-500 mb-0.5 capitalize">
                            {field}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0"
                            value={dims?.[field] ?? ""}
                            onChange={e => updateDim(order.id, field, e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm
                                       focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                      ))}
                    </div>
                    {detectedBox && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideDims(prev => ({ ...prev, [order.id]: { ...detectedBox } }));
                        }}
                        className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        Reset to detected values
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
