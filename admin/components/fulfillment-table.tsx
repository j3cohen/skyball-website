"use client";

import { useState }             from "react";
import Link                     from "next/link";
import type { ExportableOrder } from "@/lib/order-types";
import ShippingExportModal      from "./shipping-export-modal";
import BulkStatusModal          from "./bulk-status-modal";
import TrackingImportModal      from "./tracking-import-modal";

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
  const [selectedIds,            setSelectedIds]            = useState<Set<string>>(new Set());
  const [showModal,              setShowModal]              = useState(false);
  const [showBulkStatusModal,    setShowBulkStatusModal]    = useState(false);
  const [showTrackingImportModal, setShowTrackingImportModal] = useState(false);
  const [searchQuery,            setSearchQuery]            = useState("");
  const [successMessage,         setSuccessMessage]         = useState<string | null>(null);

  // Derived: filtered orders
  const filteredOrders = searchQuery.trim()
    ? orders.filter((o) => {
        const q = searchQuery.toLowerCase();
        const name  = (o.customer_name  ?? "").toLowerCase();
        const email = (o.customer_email ?? "").toLowerCase();
        const sessionSuffix = o.stripe_session_id.slice(-8).toLowerCase();
        return name.includes(q) || email.includes(q) || sessionSuffix.includes(q);
      })
    : orders;

  const allFilteredSelected =
    filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      // Deselect only filtered orders
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredOrders.forEach((o) => next.delete(o.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredOrders.forEach((o) => next.add(o.id));
        return next;
      });
    }
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

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  if (orders.length === 0) {
    return <div className="text-center py-20 text-gray-400">No orders found.</div>;
  }

  return (
    <>
      {/* Success banner */}
      {successMessage && (
        <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
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
          {/* Search input */}
          <input
            type="search"
            placeholder="Search name, email, session…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-56
                       focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkStatusModal(true)}
              className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg
                         hover:bg-amber-600 transition-colors"
            >
              Change Status ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowTrackingImportModal(true)}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            Import Tracking
          </button>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm font-medium bg-sky-600 text-white rounded-lg
                       hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Create Shipping Labels
          </button>
        </div>
      </div>

      {/* Search result count */}
      {searchQuery.trim() && (
        <p className="text-xs text-gray-400 mb-2">
          {filteredOrders.length} result{filteredOrders.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
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
            {filteredOrders.map(order => (
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
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No orders match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Shipping export modal */}
      {showModal && (
        <ShippingExportModal
          orders={selectedOrders}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Bulk status modal */}
      {showBulkStatusModal && (
        <BulkStatusModal
          orderIds={Array.from(selectedIds)}
          onClose={() => setShowBulkStatusModal(false)}
          onSuccess={(newStatus) => {
            setShowBulkStatusModal(false);
            setSelectedIds(new Set());
            showSuccess(`Status updated to "${newStatus}" for ${selectedIds.size} order(s).`);
          }}
        />
      )}

      {/* Tracking import modal */}
      {showTrackingImportModal && (
        <TrackingImportModal
          onClose={() => setShowTrackingImportModal(false)}
          onSuccess={(count) => {
            setShowTrackingImportModal(false);
            showSuccess(`${count} order${count !== 1 ? "s" : ""} updated with tracking numbers.`);
          }}
        />
      )}
    </>
  );
}
