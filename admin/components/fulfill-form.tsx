"use client";

import { useState } from "react";

type FulfillmentStatus = "pending" | "processing" | "fulfilled" | "cancelled";

type Props = {
  orderId: string;
  currentStatus: FulfillmentStatus;
  currentTracking: string | null;
  currentNotes: string | null;
};

const STATUS_OPTS: { value: FulfillmentStatus; label: string }[] = [
  { value: "pending",    label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "fulfilled",  label: "Fulfilled" },
  { value: "cancelled",  label: "Cancelled" },
];

export default function FulfillForm({
  orderId,
  currentStatus,
  currentTracking,
  currentNotes,
}: Props) {
  const [status,   setStatus]   = useState<FulfillmentStatus>(currentStatus);
  const [tracking, setTracking] = useState(currentTracking ?? "");
  const [notes,    setNotes]    = useState(currentNotes ?? "");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fulfillment_status: status,
        tracking_number: tracking || null,
        internal_notes: notes || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to save.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FulfillmentStatus)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tracking number */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Tracking number
        </label>
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="e.g. 1Z999AA10123456784"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Internal notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Internal notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes visible only to the team…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60
                   text-white font-medium text-sm py-2.5 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </form>
  );
}
