"use client";

import { useEffect, useRef, useState } from "react";
import Link                            from "next/link";
import type { ExportableOrder }        from "@/lib/order-types";
import ShippingExportModal             from "./shipping-export-modal";
import BulkStatusModal                 from "./bulk-status-modal";
import TrackingImportModal             from "./tracking-import-modal";
import FulfillmentCheatSheetModal      from "./fulfillment-cheat-sheet-modal";

const STATUS_OPTS = ["pending", "processing", "fulfilled", "cancelled"] as const;
type FulfillmentStatus = (typeof STATUS_OPTS)[number];

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

function getOrderNote(order: ExportableOrder): string | null {
  const data = order.order_data as { customer_selections?: { order_notes?: string | null } } | null;
  return data?.customer_selections?.order_notes ?? null;
}

function parseSummaryColorsByName(summary: string | null): Map<string, { ballColor?: string; gripColors?: string[] }> {
  const map = new Map<string, { ballColor?: string; gripColors?: string[] }>();
  if (!summary) return map;
  for (const part of summary.split(" | ")) {
    if (part.startsWith("Total:")) continue;
    const nameMatch = part.match(/^\d+x (.+?) \(\$/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim().toLowerCase();
    const out: { ballColor?: string; gripColors?: string[] } = {};
    const ball = part.match(/\[ball:([^\]]+)\]/);
    if (ball)  out.ballColor  = ball[1].trim();
    const grip = part.match(/\[grips:([^\]]+)\]/);
    if (grip)  out.gripColors = grip[1].split(",").map(s => s.trim());
    map.set(name, out);
  }
  return map;
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
  const [showCheatSheetModal,    setShowCheatSheetModal]    = useState(false);
  const [searchQuery,            setSearchQuery]            = useState("");
  const [successMessage,         setSuccessMessage]         = useState<string | null>(null);
  const [intlFilter,             setIntlFilter]             = useState<"all" | "domestic" | "international">("all");

  // Inline status editing
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [openStatusId,    setOpenStatusId]    = useState<string | null>(null);
  const [statusSaving,    setStatusSaving]    = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenStatusId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleInlineStatusChange(orderId: string, newStatus: FulfillmentStatus) {
    setStatusSaving(orderId);
    setOpenStatusId(null);
    try {
      const res = await fetch("/api/admin/orders/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ id: orderId, fulfillment_status: newStatus }] }),
      });
      if (res.ok) {
        setStatusOverrides((prev) => ({ ...prev, [orderId]: newStatus }));
      }
    } finally {
      setStatusSaving(null);
    }
  }

  function isInternational(o: ExportableOrder): boolean {
    const addr = o.shipping_address as { country?: string } | null;
    const country = (addr?.country ?? "").trim().toUpperCase();
    return country !== "" && country !== "US" && country !== "USA" && country !== "UNITED STATES";
  }

  // Derived: filtered orders
  const filteredOrders = orders.filter((o) => {
    if (intlFilter === "domestic"      &&  isInternational(o)) return false;
    if (intlFilter === "international" && !isInternational(o)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name  = (o.customer_name  ?? "").toLowerCase();
      const email = (o.customer_email ?? "").toLowerCase();
      const sessionSuffix = o.stripe_session_id.slice(-8).toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !sessionSuffix.includes(q)) return false;
    }
    return true;
  });

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

  function handleExportCSV() {
    const exportOrders = selectedIds.size > 0 ? selectedOrders : filteredOrders;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;

    // Find the max number of items across all orders to build fixed columns
    type RawItem = { product_name?: string | null; slug?: string | null; quantity?: number | null; customizations?: Record<string, unknown> };
    const getOrderItems = (o: ExportableOrder): RawItem[] =>
      ((o.order_data as { items?: RawItem[] } | null)?.items) ?? [];

    const maxItems = exportOrders.reduce((m, o) => Math.max(m, getOrderItems(o).length), 0);

    const itemHeaders: string[] = [];
    for (let i = 1; i <= maxItems; i++) {
      itemHeaders.push(`Item ${i}`, `Qty ${i}`, `Ball ${i}`, `Grips ${i}`);
    }

    const headers = ["Customer Name", "Email", "Date", "Status", "Total", "Note", ...itemHeaders];
    const rows: string[] = [headers.join(",")];

    for (const order of exportOrders) {
      const items      = getOrderItems(order);
      const summaryMap = parseSummaryColorsByName(order.order_summary);
      const note       = getOrderNote(order) ?? "";
      const total      = ((order.order_total_cents ?? 0) / 100).toFixed(2);
      const date       = new Date(order.created_at).toLocaleDateString("en-US");

      const itemCells: string[] = [];
      for (let i = 0; i < maxItems; i++) {
        const item = items[i];
        if (!item) { itemCells.push("", "", "", ""); continue; }
        const name    = (item.product_name ?? item.slug ?? "").toLowerCase();
        const fb      = summaryMap.get(name) ?? {};
        const ball    = (item.customizations?.ball_color  as string   | undefined) ?? fb.ballColor ?? "";
        const grips   = (item.customizations?.grip_colors as string[] | undefined) ?? fb.gripColors ?? [];
        itemCells.push(
          esc(item.product_name ?? item.slug ?? ""),
          String(item.quantity ?? 1),
          ball,
          esc(grips.join(", ")),
        );
      }

      rows.push([
        esc(order.customer_name ?? ""), esc(order.customer_email ?? ""),
        date, order.fulfillment_status, total, esc(note),
        ...itemCells,
      ].join(","));
    }

    const csv  = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleResyncColors() {
    try {
      const res = await fetch("/api/admin/orders/resync-customizations", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        showSuccess(`Re-sync complete: ${json.patched} order${json.patched !== 1 ? "s" : ""} patched.`);
      } else {
        alert(json.error ?? "Re-sync failed.");
      }
    } catch {
      alert("Network error during re-sync.");
    }
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
          {/* Domestic / International filter */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {(["all", "domestic", "international"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setIntlFilter(opt)}
                className={`px-3 py-1.5 capitalize transition-colors
                  ${intlFilter === opt
                    ? "bg-sky-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {opt}
              </button>
            ))}
          </div>
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
            onClick={handleResyncColors}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            Re-sync Colors
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export CSV {selectedIds.size > 0 ? `(${selectedIds.size})` : `(${filteredOrders.length})`}
          </button>
          <button
            onClick={() => setShowCheatSheetModal(true)}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cheat Sheet {selectedIds.size > 0 ? `(${selectedIds.size})` : `(${filteredOrders.length})`}
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900">{order.customer_name ?? "—"}</span>
                    {getOrderNote(order) && (
                      <span title={getOrderNote(order)!} className="text-amber-500 text-xs leading-none">💬</span>
                    )}
                  </div>
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
                <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <div className="relative inline-block" ref={openStatusId === order.id ? dropdownRef : null}>
                    <button
                      type="button"
                      disabled={statusSaving === order.id}
                      onClick={() => setOpenStatusId((prev) => prev === order.id ? null : order.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
                        transition-opacity ${statusSaving === order.id ? "opacity-50" : "hover:opacity-80 cursor-pointer"}
                        ${STATUS_BADGE[statusOverrides[order.id] ?? order.fulfillment_status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {statusOverrides[order.id] ?? order.fulfillment_status}
                      <svg className="w-2.5 h-2.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {openStatusId === order.id && (
                      <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px]">
                        {STATUS_OPTS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => void handleInlineStatusChange(order.id, s)}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2
                              ${(statusOverrides[order.id] ?? order.fulfillment_status) === s ? "font-semibold" : ""}`}
                          >
                            <span className={`inline-block w-2 h-2 rounded-full ${STATUS_BADGE[s]?.split(" ")[0] ?? ""}`} />
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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

      {/* Fulfillment cheat sheet modal */}
      {showCheatSheetModal && (
        <FulfillmentCheatSheetModal
          orders={selectedIds.size > 0 ? selectedOrders : filteredOrders}
          onClose={() => setShowCheatSheetModal(false)}
        />
      )}
    </>
  );
}
