"use client";

import { useState, useEffect, useRef } from "react";
import type { CandidateOrder, RowMatch } from "@/lib/pirateship-import";
import { parsePirateShipRows, matchRows } from "@/lib/pirateship-import";

type Phase = "upload" | "reviewing" | "applying" | "done";

type Props = {
  onClose: () => void;
  onSuccess: (count: number) => void;
};

function fmtMoney(cents: number | null, currency: string) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function candidateLabel(order: CandidateOrder): string {
  const name = order.customer_name ?? "Unknown";
  const summary = order.order_summary ?? "No items";
  const date = fmtDate(order.created_at);
  const total = fmtMoney(order.order_total_cents, order.order_currency);
  return `${name} — ${summary} — ${total} — ${date}`;
}

// ── Extra order selector ───────────────────────────────────────────────────────
// Lets users link one label to additional orders beyond the primary match.

function ExtraOrderSelector({
  extraOrderIds,
  excludeIds,
  allOrders,
  onAdd,
  onRemove,
}: {
  extraOrderIds: string[];
  excludeIds: string[];
  allOrders: CandidateOrder[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectVal, setSelectVal] = useState("");

  const excluded = new Set([...excludeIds, ...extraOrderIds]);
  const available = allOrders.filter((o) => !excluded.has(o.id));

  function handleAdd() {
    if (!selectVal) return;
    onAdd(selectVal);
    setSelectVal("");
    setOpen(available.length > 1); // keep open if more orders remain
  }

  return (
    <div className="mt-2 border-t border-dashed border-amber-200 pt-2 space-y-1.5">
      {/* Already-added extras */}
      {extraOrderIds.map((id) => {
        const order = allOrders.find((o) => o.id === id);
        return (
          <div key={id} className="flex items-center gap-2 text-xs bg-white border border-amber-200 rounded-md px-2 py-1">
            <span className="flex-1 truncate text-gray-700">{order ? candidateLabel(order) : id}</span>
            <button
              type="button"
              onClick={() => onRemove(id)}
              className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        );
      })}

      {/* Add button / select */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={available.length === 0}
          className="text-xs text-amber-700 hover:text-amber-900 underline disabled:opacity-40"
        >
          + Also assign to another order
        </button>
      ) : (
        <div className="flex gap-1.5">
          <select
            value={selectVal}
            onChange={(e) => setSelectVal(e.target.value)}
            className="flex-1 min-w-0 text-xs border border-amber-300 rounded-md px-2 py-1.5
                       bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">— Select another order —</option>
            {available.map((o) => (
              <option key={o.id} value={o.id}>{candidateLabel(o)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectVal}
            className="shrink-0 text-xs px-2.5 py-1.5 bg-amber-500 text-white rounded-md
                       hover:bg-amber-600 disabled:opacity-40 transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setSelectVal(""); }}
            className="shrink-0 text-xs px-2 py-1.5 bg-white text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function TrackingImportModal({ onClose, onSuccess }: Props) {
  type FilterTab = "all" | "auto" | "review" | "unmatched" | "already-imported";

  const [phase,         setPhase]         = useState<Phase>("upload");
  const [allOrders,     setAllOrders]     = useState<CandidateOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError,   setOrdersError]   = useState<string | null>(null);
  const [matches,       setMatches]       = useState<RowMatch[]>([]);
  const [applyError,    setApplyError]    = useState<string | null>(null);
  const [doneCount,     setDoneCount]     = useState(0);
  const [manualIds,     setManualIds]     = useState<Record<number, string>>({});
  const [activeFilter,  setActiveFilter]  = useState<FilterTab>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/orders/matchable");
        const json = await res.json();
        if (!res.ok) { setOrdersError(json.error ?? "Failed to load orders."); return; }
        setAllOrders(json.orders ?? []);
      } catch {
        setOrdersError("Network error loading orders.");
      } finally {
        setLoadingOrders(false);
      }
    }
    load();
  }, []);

  function updateMatch(rowIndex: number, changes: Partial<RowMatch>) {
    setMatches((prev) => prev.map((m) => (m.rowIndex === rowIndex ? { ...m, ...changes } : m)));
  }

  function addExtra(rowIndex: number, orderId: string) {
    setMatches((prev) => prev.map((m) => {
      if (m.rowIndex !== rowIndex) return m;
      const existing = m.extraOrderIds ?? [];
      if (existing.includes(orderId)) return m;
      return { ...m, extraOrderIds: [...existing, orderId] };
    }));
  }

  function removeExtra(rowIndex: number, orderId: string) {
    setMatches((prev) => prev.map((m) => {
      if (m.rowIndex !== rowIndex) return m;
      return { ...m, extraOrderIds: (m.extraOrderIds ?? []).filter((id) => id !== orderId) };
    }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const workbook = isCsv
        ? XLSX.read(await file.text(), { type: "string" })
        : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const parsed  = parsePirateShipRows(rawRows);
      const matched = matchRows(parsed, allOrders);
      setMatches(matched);
      setPhase("reviewing");
    } catch (err) {
      console.error("Failed to parse xlsx:", err);
      alert("Failed to parse file. Please ensure it is a valid PirateShip xlsx export.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleApply() {
    const toApply = matches.filter((m) => !m.skipped && m.selectedOrderId);
    if (toApply.length === 0) return;

    setPhase("applying");
    setApplyError(null);

    try {
      const updates = toApply.flatMap((m) => {
        const trackingEntry   = { number: m.row.trackingNumber, tracking_status: m.row.status };
        const statusUpdateObj = { number: m.row.trackingNumber, tracking_status: m.row.status };

        if (m.isStatusUpdate) {
          // Already-imported: status updates to all linked orders
          const allIds = [m.selectedOrderId!, ...(m.additionalOrderIds ?? [])];
          return allIds.map((id) => ({ id, tracking_status_update: statusUpdateObj }));
        }

        // Primary order gets the new tracking entry + label cost
        const primary = {
          id: m.selectedOrderId!,
          shipping_label_cost: m.row.cost,
          tracking_entry: trackingEntry,
        };

        // Manually-added extra orders also get the full tracking entry (same box)
        const extras = (m.extraOrderIds ?? []).map((id) => ({
          id,
          tracking_entry: trackingEntry,
        }));

        // Orders that already carry this label just get a status update
        const alreadyLinked = (m.additionalOrderIds ?? []).map((id) => ({
          id,
          tracking_status_update: statusUpdateObj,
        }));

        return [primary, ...extras, ...alreadyLinked];
      });

      const res  = await fetch("/api/admin/orders/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();

      if (!res.ok) {
        setApplyError(json.error ?? "Failed to apply updates.");
        setPhase("reviewing");
        return;
      }

      setDoneCount(json.successCount ?? toApply.length);
      setPhase("done");
      onSuccess(json.successCount ?? toApply.length);
    } catch {
      setApplyError("Network error. Please try again.");
      setPhase("reviewing");
    }
  }

  const autoCount          = matches.filter((m) => m.confidence === "auto").length;
  const reviewCount        = matches.filter((m) => m.confidence === "review").length;
  const unmatchedCount     = matches.filter((m) => m.confidence === "unmatched").length;
  const alreadyImportedCount = matches.filter((m) => m.confidence === "already-imported").length;
  const readyCount         = matches.filter((m) => !m.skipped && m.selectedOrderId).length;
  const blockedCount       = matches.filter(
    (m) => m.confidence === "review" && !m.skipped && !m.selectedOrderId
  ).length;

  const filteredMatches = activeFilter === "all"
    ? matches
    : matches.filter((m) => m.confidence === activeFilter);

  const filterTabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: "all",              label: "All",            count: matches.length,       color: "gray" },
    { key: "auto",             label: "Auto-matched",   count: autoCount,            color: "green" },
    { key: "review",           label: "Needs Review",   count: reviewCount,          color: "amber" },
    { key: "unmatched",        label: "Unmatched",      count: unmatchedCount,       color: "gray" },
    { key: "already-imported", label: "Status updates", count: alreadyImportedCount, color: "sky" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={phase === "done" ? onClose : undefined} />

      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Import Tracking Numbers</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none" aria-label="Close">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Upload phase */}
          {phase === "upload" && (
            <div className="space-y-4">
              {loadingOrders ? (
                <p className="text-sm text-gray-500">Loading orders…</p>
              ) : ordersError ? (
                <p className="text-sm text-red-600">{ordersError}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Upload a PirateShip xlsx export to automatically match tracking numbers to orders.
                    {" "}<span className="font-medium">{allOrders.length} eligible orders</span> loaded.
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <p className="text-sm text-gray-500 mb-3">Select a .xlsx file from PirateShip</p>
                    <label className="cursor-pointer">
                      <input ref={fileInputRef} type="file" accept=".xlsx" className="sr-only" onChange={handleFileChange} />
                      <span className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors inline-block">
                        Choose File
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reviewing phase */}
          {phase === "reviewing" && (
            <div className="space-y-4">
              {/* Filter tabs */}
              <div className="flex flex-wrap gap-1.5 text-xs font-medium border-b border-gray-200 pb-3">
                {filterTabs.map((tab) => {
                  const isActive = activeFilter === tab.key;
                  const colorMap: Record<string, string> = {
                    green: isActive ? "bg-green-600 text-white" : "bg-green-100 text-green-800 hover:bg-green-200",
                    amber: isActive ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200",
                    gray:  isActive ? "bg-gray-700 text-white"  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    sky:   isActive ? "bg-sky-600 text-white"   : "bg-sky-100 text-sky-700 hover:bg-sky-200",
                  };
                  return (
                    <button key={tab.key} type="button" onClick={() => setActiveFilter(tab.key)}
                      className={`rounded-full px-3 py-1 transition-colors ${colorMap[tab.color]}`}>
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>

              {applyError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{applyError}</p>}
              {matches.length === 0 && <p className="text-sm text-gray-500">No trackable rows found in the file.</p>}

              <div className="space-y-2">
                {filteredMatches.length === 0 && matches.length > 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No rows in this category.</p>
                )}

                {filteredMatches.map((m) => {
                  // ── Status updates (already-imported) ───────────────────────
                  if (m.confidence === "already-imported") {
                    const totalOrders = 1 + (m.additionalOrderIds?.length ?? 0);
                    return (
                      <div key={m.rowIndex} className="text-xs bg-sky-50 border border-sky-200 rounded-lg px-4 py-2 flex items-center gap-2">
                        <span className="text-sky-400 shrink-0">↻</span>
                        <span className="text-gray-600">
                          <span className="font-mono text-gray-700">{m.row.trackingNumber}</span>
                          {m.row.recipient && <span className="text-gray-400 ml-1">({m.row.recipient})</span>}
                          {totalOrders > 1 && <span className="ml-2 text-sky-600 font-medium">· {totalOrders} orders</span>}
                        </span>
                        {m.row.status && <span className="ml-auto text-sky-700 font-medium shrink-0">→ {m.row.status}</span>}
                      </div>
                    );
                  }

                  // ── Auto-matched ─────────────────────────────────────────────
                  if (m.confidence === "auto") {
                    const order = m.candidates[0];
                    const extraCount = (m.extraOrderIds ?? []).length;
                    return (
                      <div key={m.rowIndex} className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-green-700 mb-1">
                              Auto-matched{extraCount > 0 && <span className="ml-2 text-green-600">+ {extraCount} extra order{extraCount > 1 ? "s" : ""}</span>}
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-700">
                              <div><span className="text-gray-400">Recipient: </span>{m.row.recipient || "—"}</div>
                              <div><span className="text-gray-400">Customer: </span>{order?.customer_name ?? "—"}</div>
                              <div className="col-span-2">
                                <span className="text-gray-400">Tracking: </span>
                                <span className="font-mono">{m.row.trackingNumber}</span>
                                <span className="ml-3 text-gray-400">Cost: </span>
                                ${m.row.cost.toFixed(2)}
                              </div>
                              {order && (
                                <div className="col-span-2">
                                  <span className="text-gray-400">Order: </span>
                                  {order.order_summary ?? "—"} — {fmtMoney(order.order_total_cents, order.order_currency)}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => updateMatch(m.rowIndex, { confidence: "review", selectedOrderId: null })}
                            className="shrink-0 text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Override
                          </button>
                        </div>
                        <ExtraOrderSelector
                          extraOrderIds={m.extraOrderIds ?? []}
                          excludeIds={[m.selectedOrderId ?? "", ...(m.additionalOrderIds ?? [])]}
                          allOrders={allOrders}
                          onAdd={(id) => addExtra(m.rowIndex, id)}
                          onRemove={(id) => removeExtra(m.rowIndex, id)}
                        />
                      </div>
                    );
                  }

                  // ── Needs Review ─────────────────────────────────────────────
                  if (m.confidence === "review") {
                    const extraCount = (m.extraOrderIds ?? []).length;
                    return (
                      <div key={m.rowIndex} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-amber-700 mb-2">
                          Needs Review{extraCount > 0 && <span className="ml-2 text-amber-600 font-normal">+ {extraCount} extra order{extraCount > 1 ? "s" : ""}</span>}
                        </p>
                        <div className="text-xs text-gray-700 mb-2 space-y-0.5">
                          <div>
                            <span className="text-gray-400">Recipient: </span>{m.row.recipient || "—"}
                            <span className="ml-3 text-gray-400">Email: </span>{m.row.email || "—"}
                          </div>
                          <div>
                            <span className="text-gray-400">Tracking: </span>
                            <span className="font-mono">{m.row.trackingNumber}</span>
                            <span className="ml-3 text-gray-400">Cost: </span>
                            ${m.row.cost.toFixed(2)}
                            <span className="ml-3 text-gray-400">Label date: </span>
                            {m.row.createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <select
                            value={m.selectedOrderId ?? ""}
                            onChange={(e) => {
                              const chosen = e.target.value || null;
                              const remaining = (m.additionalOrderIds ?? []).filter((id) => id !== chosen);
                              updateMatch(m.rowIndex, { selectedOrderId: chosen, skipped: false, additionalOrderIds: remaining });
                            }}
                            className="w-full text-xs border border-amber-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            <option value="">— Select an order —</option>
                            {m.candidates.map((c) => (
                              <option key={c.id} value={c.id}>{candidateLabel(c)}</option>
                            ))}
                          </select>
                          <div className="flex justify-end">
                            <button
                              onClick={() => updateMatch(m.rowIndex, { skipped: !m.skipped })}
                              className={`text-xs px-2 py-1.5 rounded-md border transition-colors ${
                                m.skipped ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {m.skipped ? "Skipped" : "Skip"}
                            </button>
                          </div>
                        </div>
                        {m.selectedOrderId && (
                          <ExtraOrderSelector
                              extraOrderIds={m.extraOrderIds ?? []}
                            excludeIds={[m.selectedOrderId, ...(m.additionalOrderIds ?? [])]}
                            allOrders={allOrders}
                            onAdd={(id) => addExtra(m.rowIndex, id)}
                            onRemove={(id) => removeExtra(m.rowIndex, id)}
                          />
                        )}
                      </div>
                    );
                  }

                  // ── Unmatched ────────────────────────────────────────────────
                  return (
                    <div key={m.rowIndex} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Unmatched</p>
                      <div className="text-xs text-gray-600 mb-2 space-y-0.5">
                        <div>
                          <span className="text-gray-400">Recipient: </span>{m.row.recipient || "—"}
                          <span className="ml-3 text-gray-400">Email: </span>{m.row.email || "—"}
                        </div>
                        <div>
                          <span className="text-gray-400">Tracking: </span>
                          <span className="font-mono">{m.row.trackingNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m.skipped}
                            onChange={(e) => {
                              const skipped = e.target.checked;
                              updateMatch(m.rowIndex, { skipped, selectedOrderId: skipped ? null : (manualIds[m.rowIndex] || null) });
                            }}
                            className="rounded border-gray-300 text-sky-600"
                          />
                          Skip this row
                        </label>
                        {!m.skipped && (
                          <input
                            type="text"
                            placeholder="Enter order ID manually…"
                            value={manualIds[m.rowIndex] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualIds((prev) => ({ ...prev, [m.rowIndex]: val }));
                              updateMatch(m.rowIndex, { selectedOrderId: val.trim() || null });
                            }}
                            className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Applying phase */}
          {phase === "applying" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Applying updates…</p>
            </div>
          )}

          {/* Done phase */}
          {phase === "done" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Done!</p>
                <p className="text-sm text-gray-500 mt-1">{doneCount} order{doneCount !== 1 ? "s" : ""} updated successfully.</p>
              </div>
              <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors">
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === "reviewing" && matches.length > 0 && (
          <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              {blockedCount > 0 && (
                <span className="text-amber-600 font-medium">
                  {blockedCount} review row{blockedCount !== 1 ? "s" : ""} need a selection.
                </span>
              )}
            </div>
            <button
              onClick={handleApply}
              disabled={readyCount === 0 || blockedCount > 0}
              className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Apply {readyCount} match{readyCount !== 1 ? "es" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
