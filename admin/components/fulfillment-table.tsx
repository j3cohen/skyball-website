"use client";

import { useState }             from "react";
import Link                     from "next/link";
import type { ExportableOrder } from "@/lib/order-types";
import ShippingExportModal      from "./shipping-export-modal";

type Props = {
  orders: ExportableOrder[];
};

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  fulfilled:  "bg-green-100 text-green-800",
  cancelled:  "bg-gray-100 text-gray-600",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtMoney(cents: number | null, currency: string) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function FulfillmentTable({ orders }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal,   setShowModal]   = useState(false);

  const allSelected = orders.length > 0 && orders.every(o => selectedIds.has(o.id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(orders.map(o => o.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    const ids = orders
      .filter(o => o.fulfillment_status === "pending")
      .map(o => o.id);
    setSelectedIds(new Set(ids));
  };

  const selectedOrders = orders.filter(o => selectedIds.has(o.id));

  if (orders.length === 0) {
    return <div className="text-center py-20 text-gray-400">No orders found.</div>;
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <button
            onClick={selectAllPending}
            className="text-sm text-sky-600 hover:text-sky-800 font-medium transition-colors"
          >
            Select all pending
          </button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <button
          disabled={selectedIds.size === 0}
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-medium bg-sky-600 text-white rounded-lg
                     hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Create Shipping Labels
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Items</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(order => (
              <tr
                key={order.id}
                className={`transition-colors cursor-pointer ${
                  selectedIds.has(order.id) ? "bg-sky-50" : "hover:bg-gray-50"
                }`}
                onClick={() => toggleOne(order.id)}
              >
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={() => toggleOne(order.id)}
                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                  {fmtDate(order.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{order.customer_name ?? "—"}</div>
                  <div className="text-xs text-gray-400">{order.customer_email ?? "—"}</div>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <span className="text-gray-600 text-xs line-clamp-2">
                    {order.order_summary ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                  {fmtMoney(order.order_total_cents, order.order_currency)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium
                    ${STATUS_BADGE[order.fulfillment_status] ?? "bg-gray-100 text-gray-600"}`}>
                    {order.fulfillment_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <Link
                    href={`/fulfillment/${order.id}`}
                    className="text-sky-600 hover:text-sky-800 font-medium text-xs"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ShippingExportModal
          orders={selectedOrders}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
