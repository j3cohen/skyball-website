"use client";

import { useState } from "react";

type Props = {
  orderIds: string[];
  onClose: () => void;
  onSuccess: (newStatus: string) => void;
};

const STATUS_OPTIONS = [
  { value: "pending",    label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "fulfilled",  label: "Fulfilled" },
  { value: "cancelled",  label: "Cancelled" },
] as const;

export default function BulkStatusModal({ orderIds, onClose, onSuccess }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<string>("processing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (!selectedStatus) return;
    setLoading(true);
    setError(null);

    try {
      const updates = orderIds.map((id) => ({ id, fulfillment_status: selectedStatus }));
      const res = await fetch("/api/admin/orders/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to update orders.");
        return;
      }

      onSuccess(selectedStatus);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Change Order Status</h2>
        <p className="text-sm text-gray-500 mb-5">
          Updating {orderIds.length} selected order{orderIds.length !== 1 ? "s" : ""}.
        </p>

        {/* Status options */}
        <fieldset className="space-y-2 mb-6">
          <legend className="text-sm font-medium text-gray-700 mb-2">New status</legend>
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 cursor-pointer rounded-lg border border-gray-200
                         px-4 py-3 hover:bg-gray-50 transition-colors has-[:checked]:border-sky-500
                         has-[:checked]:bg-sky-50"
            >
              <input
                type="radio"
                name="bulk-status"
                value={opt.value}
                checked={selectedStatus === opt.value}
                onChange={() => setSelectedStatus(opt.value)}
                className="text-sky-600 focus:ring-sky-500"
              />
              <span className="text-sm font-medium text-gray-800">{opt.label}</span>
            </label>
          ))}
        </fieldset>

        {/* Error */}
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300
                       rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || !selectedStatus}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg
                       hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
