"use client";

import { useState }                         from "react";
import { X, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
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

  // Each order carries an array of boxes (parcels). Most orders ship in one box,
  // but some are cheaper to split across several — each box becomes its own
  // Pirate Ship label / CSV row.
  // Auto-classified: one box pre-filled with detected values.
  // Needs-input: one empty box (user must fill before download is enabled).
  const [overrideBoxes, setOverrideBoxes] = useState<Record<string, Partial<BoxDimensions>[]>>(
    Object.fromEntries(
      classified.map(({ order, result }) => [
        order.id,
        result.kind !== "needs-input" ? [{ ...result.box }] : [{}],
      ])
    )
  );

  // Needs-input cards start expanded; auto-classified start collapsed.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(classified.filter(c => c.result.kind === "needs-input").map(c => c.order.id))
  );

  const updateDim = (id: string, boxIdx: number, field: keyof BoxDimensions, raw: string) => {
    const n = parseFloat(raw);
    setOverrideBoxes(prev => ({
      ...prev,
      [id]: prev[id].map((box, i) =>
        i === boxIdx ? { ...box, [field]: isNaN(n) ? undefined : n } : box
      ),
    }));
  };

  const addBox = (id: string) => {
    setOverrideBoxes(prev => ({ ...prev, [id]: [...prev[id], {}] }));
    setExpandedIds(prev => new Set(prev).add(id));
  };

  const removeBox = (id: string, boxIdx: number) => {
    setOverrideBoxes(prev => {
      const next = prev[id].filter((_, i) => i !== boxIdx);
      return { ...prev, [id]: next.length ? next : [{}] };
    });
  };

  const resetBoxes = (id: string, box: BoxDimensions) => {
    setOverrideBoxes(prev => ({ ...prev, [id]: [{ ...box }] }));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Download is blocked until every box of every order has all dims filled.
  const allFilled = classified.every(({ order }) => {
    const boxes = overrideBoxes[order.id] ?? [];
    return boxes.length > 0 && boxes.every(dimsFilled);
  });

  const totalLabels = classified.reduce(
    (sum, { order }) => sum + (overrideBoxes[order.id]?.length ?? 0),
    0
  );

  const handleDownload = () => {
    const rows = classified.flatMap(({ order }) => {
      const addr  = getAddr(order);
      const boxes = overrideBoxes[order.id] ?? [];

      // One CSV row (label) per box.
      return boxes.map(box => ({
        customer_name:  order.customer_name,
        customer_email: order.customer_email,
        address_line1:  addr?.line1,
        address_line2:  addr?.line2,
        city:           addr?.city,
        state:          addr?.state,
        zip:            addr?.postal_code,
        country:        addr?.country,
        length: box.length ?? 0,
        width:  box.width  ?? 0,
        height: box.height ?? 0,
        pounds: box.pounds ?? 0,
        ounces: box.ounces ?? 0,
      }));
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
              {" · "}Click a label to edit dimensions or split it into multiple boxes.
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
            const boxes        = overrideBoxes[order.id] ?? [];
            const isMulti      = boxes.length > 1;
            const detectedBox  = !isNeedsInput ? (result as Exclude<BoxResult, { kind: "needs-input" }>).box : null;
            const isEdited     = isMulti || (detectedBox && boxes[0]
              ? DIM_FIELDS.some(f => boxes[0][f] !== detectedBox[f])
              : false);
            const firstBox     = boxes[0];

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
                    <p className={`text-xs text-gray-500 mt-0.5 ${isExpanded ? "" : "line-clamp-1"}`}>
                      {order.order_summary ?? "No summary"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isNeedsInput ? (
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">
                        Needs input{isMulti ? ` · ${boxes.length} boxes` : ""}
                      </span>
                    ) : (
                      <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${
                        isEdited
                          ? "bg-sky-100 text-sky-800"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {isEdited ? "✎ " : ""}
                        {isMulti
                          ? `${boxes.length} boxes`
                          : <>
                              {firstBox?.length ?? result.box.length}×{firstBox?.width ?? result.box.width}×{firstBox?.height ?? result.box.height}&quot;
                              {" · "}
                              {firstBox?.pounds ?? result.box.pounds}lb {firstBox?.ounces ?? result.box.ounces}oz
                            </>}
                      </span>
                    )}
                    {isNeedsInput ? null : isExpanded
                      ? <ChevronUp size={16} className="text-gray-400" />
                      : <Pencil size={14} className="text-gray-400" />
                    }
                  </div>
                </button>

                {/* Expandable box editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 pt-3 space-y-3">
                    {isNeedsInput && (
                      <p className="text-xs font-medium text-amber-800">
                        Large or unusual order — enter dimensions manually:
                      </p>
                    )}

                    {boxes.map((box, boxIdx) => (
                      <div
                        key={boxIdx}
                        className={isMulti ? "rounded-md border border-gray-200 bg-white p-3" : ""}
                      >
                        {isMulti && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700">
                              Box {boxIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeBox(order.id, boxIdx)}
                              className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                                value={box?.[field] ?? ""}
                                onChange={e => updateDim(order.id, boxIdx, field, e.target.value)}
                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm
                                           focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => addBox(order.id)}
                        className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors"
                      >
                        <Plus size={14} /> Add another box
                      </button>
                      {detectedBox && (
                        <button
                          type="button"
                          onClick={() => resetBoxes(order.id, detectedBox)}
                          className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          Reset to detected
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <span className="mr-auto text-xs text-gray-500">
            {totalLabels} label{totalLabels !== 1 ? "s" : ""} to export
          </span>
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
