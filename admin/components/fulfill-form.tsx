"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

type FulfillmentStatus = "pending" | "processing" | "fulfilled" | "cancelled";

export type TrackingEntry = {
  number: string;
  tracking_status: string;
  added_at: string;
};

type Props = {
  orderId: string;
  currentStatus: FulfillmentStatus;
  currentTracking: string | null;
  currentNotes: string | null;
  currentTrackingNumbers?: TrackingEntry[];
  refundAmountCents?: number;
  refundStatus?: string;
};

const STATUS_OPTS: { value: FulfillmentStatus; label: string }[] = [
  { value: "pending",    label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "fulfilled",  label: "Fulfilled" },
  { value: "cancelled",  label: "Cancelled" },
];

const TRACKING_STATUS_OPTS = [
  "Delivered",
  "In Transit",
  "Refunded",
  "New label, not scanned yet",
  "Other",
];

function trackingStatusBadge(ts: string) {
  if (ts === "Delivered") return "bg-green-100 text-green-800";
  if (ts === "In Transit") return "bg-blue-100 text-blue-800";
  if (ts === "Refunded")   return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-600";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FulfillForm({
  orderId,
  currentStatus,
  currentTracking,
  currentNotes,
  currentTrackingNumbers = [],
  refundAmountCents = 0,
  refundStatus = "none",
}: Props) {
  // ── Status + notes (saved together) ───────────────────────────────────────
  const [savedStatus,   setSavedStatus]   = useState<FulfillmentStatus>(currentStatus);
  const [savedNotes,    setSavedNotes]    = useState(currentNotes ?? "");
  const [status,        setStatus]        = useState<FulfillmentStatus>(currentStatus);
  const [notes,         setNotes]         = useState(currentNotes ?? "");
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [showOriginal,  setShowOriginal]  = useState(false);

  // ── Tracking numbers (managed independently) ──────────────────────────────
  // Merge legacy tracking_number into the array if not already present
  const initTracking: TrackingEntry[] = useMemo(() => {
    const arr = [...currentTrackingNumbers];
    if (currentTracking && !arr.some((t) => t.number === currentTracking)) {
      arr.unshift({ number: currentTracking, tracking_status: "Unknown", added_at: "" });
    }
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [trackingNumbers, setTrackingNumbers] = useState<TrackingEntry[]>(initTracking);
  const [newNumber,       setNewNumber]       = useState("");
  const [newStatus,       setNewStatus]       = useState("Delivered");
  const [trackingError,   setTrackingError]   = useState<string | null>(null);
  const [trackingSaving,  setTrackingSaving]  = useState(false);

  // ── Inline edit state ─────────────────────────────────────────────────────
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editNumber,   setEditNumber]   = useState("");
  const [editStatus,   setEditStatus]   = useState("");

  const isDirty = status !== savedStatus || notes !== savedNotes;
  const displayStatus = showOriginal ? savedStatus : status;
  const displayNotes  = showOriginal ? savedNotes  : notes;

  // ── Save status + notes ────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (showOriginal) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfillment_status: status, internal_notes: notes || null }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Failed to save.");
    } else {
      setSavedStatus(status);
      setSavedNotes(notes);
      setSaved(true);
      setShowOriginal(false);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  // ── Add tracking number ────────────────────────────────────────────────────
  async function handleAddTracking() {
    const num = newNumber.trim();
    if (!num) return;
    if (trackingNumbers.some((t) => t.number === num)) {
      setTrackingError("That tracking number is already added.");
      return;
    }

    setTrackingSaving(true);
    setTrackingError(null);

    const entry: TrackingEntry = {
      number: num,
      tracking_status: newStatus,
      added_at: new Date().toISOString(),
    };

    const updated = [...trackingNumbers, entry];
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_numbers: updated }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setTrackingError((body as { error?: string }).error ?? "Failed to save tracking number.");
    } else {
      setTrackingNumbers(updated);
      setNewNumber("");
    }
    setTrackingSaving(false);
  }

  // ── Remove tracking number ─────────────────────────────────────────────────
  async function handleRemoveTracking(index: number) {
    const updated = trackingNumbers.filter((_, i) => i !== index);
    setTrackingSaving(true);
    setTrackingError(null);

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_numbers: updated }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setTrackingError((body as { error?: string }).error ?? "Failed to remove tracking number.");
    } else {
      setTrackingNumbers(updated);
    }
    setTrackingSaving(false);
  }

  // ── Edit tracking number ───────────────────────────────────────────────────
  function startEdit(index: number) {
    setEditingIndex(index);
    setEditNumber(trackingNumbers[index].number);
    setEditStatus(trackingNumbers[index].tracking_status);
    setTrackingError(null);
  }

  async function handleEditSave(index: number) {
    const num = editNumber.trim();
    if (!num) return;
    if (trackingNumbers.some((t, i) => i !== index && t.number === num)) {
      setTrackingError("That tracking number is already added.");
      return;
    }

    setTrackingSaving(true);
    setTrackingError(null);

    const updated = trackingNumbers.map((t, i) =>
      i === index ? { ...t, number: num, tracking_status: editStatus } : t
    );

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_numbers: updated }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setTrackingError((body as { error?: string }).error ?? "Failed to save.");
    } else {
      setTrackingNumbers(updated);
      setEditingIndex(null);
    }
    setTrackingSaving(false);
  }

  const previewClass = showOriginal ? "opacity-60 pointer-events-none select-none" : "";

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Status */}
      <div className={previewClass}>
        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
        <select
          value={displayStatus}
          onChange={(e) => setStatus(e.target.value as FulfillmentStatus)}
          disabled={showOriginal}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-50"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Tracking numbers */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Tracking numbers</label>

        {trackingNumbers.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {trackingNumbers.map((t, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                {editingIndex === i ? (
                  /* ── Inline edit form ── */
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="w-full font-mono text-xs border border-gray-300 rounded-md px-2 py-1
                                 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-md bg-white px-2 py-1
                                 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {TRACKING_STATUS_OPTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={trackingSaving || !editNumber.trim()}
                        onClick={() => void handleEditSave(i)}
                        className="text-xs px-2.5 py-1 bg-sky-600 text-white rounded-md
                                   hover:bg-sky-700 disabled:opacity-40 transition-colors"
                      >
                        {trackingSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={trackingSaving}
                        onClick={() => setEditingIndex(null)}
                        className="text-xs px-2.5 py-1 bg-white text-gray-600 border border-gray-300
                                   rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal display ── */
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-gray-900 truncate">{t.number}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {t.tracking_status && (
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${trackingStatusBadge(t.tracking_status)}`}>
                            {t.tracking_status}
                          </span>
                        )}
                        {t.added_at && (
                          <span className="text-xs text-gray-400">{fmtDate(t.added_at)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={trackingSaving}
                      onClick={() => startEdit(i)}
                      className="shrink-0 p-1 rounded text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-40"
                      aria-label="Edit"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={trackingSaving}
                      onClick={() => void handleRemoveTracking(i)}
                      className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      aria-label="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new tracking number */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleAddTracking(); } }}
            placeholder="Add tracking number…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs
                       focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {TRACKING_STATUS_OPTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!newNumber.trim() || trackingSaving}
            onClick={handleAddTracking}
            className="shrink-0 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40
                       px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors"
          >
            Add
          </button>
        </div>

        {trackingError && (
          <p className="mt-1 text-xs text-red-600">{trackingError}</p>
        )}
      </div>

      {/* Internal notes */}
      <div className={previewClass}>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Internal notes
        </label>
        <textarea
          rows={3}
          value={displayNotes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={showOriginal}
          placeholder="Notes visible only to the team…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none disabled:bg-gray-50"
        />
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            {showOriginal ? "Showing saved version" : "Unsaved changes"}
          </div>
          <button
            type="button"
            onClick={() => setShowOriginal(v => !v)}
            className="text-xs font-medium text-amber-700 hover:text-amber-900 underline shrink-0"
          >
            {showOriginal ? "Back to edits" : "View original"}
          </button>
        </div>
      )}

      {/* Refund info (set via Stripe import) */}
      {refundStatus !== "none" && (
        <div className={`rounded-lg border px-3 py-2.5 text-sm ${
          refundStatus === "full"
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          <span className="font-medium">
            {refundStatus === "full" ? "Fully refunded" : "Partially refunded"}
          </span>
          {refundAmountCents > 0 && (
            <span className="ml-1.5">
              — ${(refundAmountCents / 100).toFixed(2)} refunded
            </span>
          )}
          <p className="text-xs opacity-70 mt-0.5">Synced from Stripe. Edit via Stripe dashboard.</p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || showOriginal}
        className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60
                   text-white font-medium text-sm py-2.5 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </form>
  );
}
