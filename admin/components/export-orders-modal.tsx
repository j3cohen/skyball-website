"use client";

// Export orders to CSV at a chosen scope.
//
// The table only holds the current page, so "everything matching my filters"
// has to come from the server. The count is fetched up front — nobody should
// have to download a file to find out how many rows it has.

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { buildOrdersCsv } from "@/lib/order-csv";
import { triggerCsvDownload } from "@/lib/csv-export";
import type { ExportableOrder } from "@/lib/order-types";

type Scope = "selected" | "page" | "all";

type Props = {
  /** Rows currently rendered (after the region filter). */
  pageOrders: ExportableOrder[];
  selectedOrders: ExportableOrder[];
  /** The filters the page is showing, so "all" means the same thing. */
  status: string;
  search: string;
  region: "all" | "domestic" | "international";
  onClose: () => void;
};

const PRESETS: { label: string; days: number | null }[] = [
  { label: "Any date",     days: null },
  { label: "Last 7 days",  days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
];

export default function ExportOrdersModal({
  pageOrders, selectedOrders, status, search, region, onClose,
}: Props) {
  const [scope, setScope]   = useState<Scope>(selectedOrders.length > 0 ? "selected" : "all");
  const [from, setFrom]     = useState("");
  const [to, setTo]         = useState("");
  const [count, setCount]   = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const params = useCallback((extra: Record<string, string> = {}) => {
    const p = new URLSearchParams(extra);
    if (status && status !== "all") p.set("status", status);
    if (search.trim()) p.set("q", search.trim());
    if (region !== "all") p.set("region", region);
    if (from) p.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to)   p.set("to",   new Date(`${to}T23:59:59.999`).toISOString());
    return p;
  }, [status, search, region, from, to]);

  // Live count for the "all matching" scope.
  useEffect(() => {
    if (scope !== "all") { setCount(null); return; }
    let cancelled = false;
    setCounting(true);
    setError(null);
    // Debounced: typing into a date field shouldn't fire a request per keystroke.
    const t = setTimeout(() => {
      fetch(`/api/admin/orders/export?${params({ countOnly: "1" })}`)
        .then((r) => r.json())
        .then((j) => { if (!cancelled) setCount(j.total ?? 0); })
        .catch(() => { if (!cancelled) setError("Couldn't count matching orders."); })
        .finally(() => { if (!cancelled) setCounting(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [scope, params]);

  function setPreset(days: number | null) {
    if (days == null) { setFrom(""); setTo(""); return; }
    const now = new Date();
    const start = new Date(now.getTime() - (days - 1) * 864e5);
    setFrom(start.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  }

  /** Rows for a local scope, narrowed by the date range if one is set. */
  function inRange(rows: ExportableOrder[]): ExportableOrder[] {
    if (!from && !to) return rows;
    const lo = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const hi = to   ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return rows.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= lo && t <= hi;
    });
  }

  const localCount =
    scope === "selected" ? inRange(selectedOrders).length
    : scope === "page"   ? inRange(pageOrders).length
    : null;

  const willExport = scope === "all" ? count : localCount;

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      let rows: ExportableOrder[];
      if (scope === "all") {
        const res = await fetch(`/api/admin/orders/export?${params()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Export failed.");
        rows = json.orders ?? [];
      } else {
        rows = inRange(scope === "selected" ? selectedOrders : pageOrders);
      }

      if (rows.length === 0) { setError("No orders match — nothing to export."); return; }

      const stamp = new Date().toISOString().slice(0, 10);
      triggerCsvDownload(buildOrdersCsv(rows), `orders-${stamp}.csv`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  const scopes: { value: Scope; label: string; hint: string; disabled?: boolean }[] = [
    {
      value: "selected",
      label: `Selected orders (${inRange(selectedOrders).length})`,
      hint: "Only the rows you ticked",
      disabled: selectedOrders.length === 0,
    },
    {
      value: "page",
      label: `This page (${inRange(pageOrders).length})`,
      hint: "Just the rows currently on screen",
    },
    {
      value: "all",
      label: "All matching filters",
      hint: "Every order matching the status, search and region above — across all pages",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Export orders</h2>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Scope */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              What to export
            </legend>
            <div className="space-y-1.5">
              {scopes.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                    scope === s.value ? "border-sky-300 bg-sky-50" : "border-gray-200 hover:bg-gray-50"
                  } ${s.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <input
                    type="radio"
                    name="scope"
                    className="mt-0.5"
                    checked={scope === s.value}
                    disabled={s.disabled}
                    onChange={() => setScope(s.value)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{s.label}</span>
                    <span className="block text-xs text-gray-500">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Date range */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Date range <span className="font-normal normal-case text-gray-400">(optional)</span>
            </p>
            <div className="mb-2 flex flex-wrap gap-1">
              {PRESETS.map((p) => {
                const active = p.days == null ? !from && !to : false;
                return (
                  <button
                    key={p.label}
                    onClick={() => setPreset(p.days)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "bg-sky-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700"
                aria-label="Start date"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700"
                aria-label="End date"
              />
            </div>
          </div>

          {/* Count */}
          <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
            {counting ? (
              <span className="text-gray-400">Counting…</span>
            ) : willExport == null ? (
              <span className="text-gray-400">—</span>
            ) : (
              <span className="text-gray-700">
                <strong className="text-gray-900">{willExport.toLocaleString()}</strong>{" "}
                order{willExport !== 1 ? "s" : ""} will be exported
              </span>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="text-sm text-gray-500 transition-colors hover:text-gray-700">
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={busy || counting || !willExport}
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white transition-colors
                       hover:bg-sky-700 disabled:opacity-40"
          >
            {busy ? "Preparing…" : "Download CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}
