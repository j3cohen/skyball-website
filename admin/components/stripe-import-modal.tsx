"use client";

import { useState, useEffect, useRef } from "react";
import type { StripeCandidateOrder, StripeRowMatch } from "@/lib/stripe-import";
import { parseStripeRows, matchStripeRows, parseCLSItems, detectStripeOrderKind } from "@/lib/stripe-import";

type Phase = "upload" | "reviewing" | "applying" | "done";
type FilterTab = "all" | "update-refund" | "new-order" | "review" | "no-action";

type Props = {
  onClose:   () => void;
  onSuccess: (count: number) => void;
};

function fmtMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function candidateLabel(o: StripeCandidateOrder): string {
  return `${o.customer_name ?? "Unknown"} — ${o.order_summary ?? "No items"} — ${fmtMoney(o.order_total_cents ?? 0, o.order_currency)} — ${fmtDate(o.created_at)}`;
}

const REFUND_BADGE: Record<string, string> = {
  none:    "bg-gray-100 text-gray-500",
  partial: "bg-amber-100 text-amber-700",
  full:    "bg-red-100 text-red-700",
};

export default function StripeImportModal({ onClose, onSuccess }: Props) {
  const [phase,       setPhase]       = useState<Phase>("upload");
  const [allOrders,   setAllOrders]   = useState<StripeCandidateOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [matches,     setMatches]     = useState<StripeRowMatch[]>([]);
  const [applyError,  setApplyError]  = useState<string | null>(null);
  const [doneCount,   setDoneCount]   = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [manualIds,   setManualIds]   = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/orders/matchable-stripe")
      .then((r) => r.json())
      .then((j) => setAllOrders(j.orders ?? []))
      .catch(() => setOrdersError("Failed to load orders."))
      .finally(() => setLoadingOrders(false));
  }, []);

  function updateMatch(rowIndex: number, changes: Partial<StripeRowMatch>) {
    setMatches((prev) => prev.map((m) => m.rowIndex === rowIndex ? { ...m, ...changes } : m));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer);
      const ws = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const parsed  = parseStripeRows(rawRows);
      const matched = matchStripeRows(parsed, allOrders);
      setMatches(matched);
      setPhase("reviewing");
    } catch (err) {
      console.error(err);
      alert("Failed to parse file. Please use a Stripe Payments CSV or XLSX export.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleApply() {
    const toApply = matches.filter((m) => !m.skipped && (m.selectedOrderId || m.confidence === "new-order"));
    if (toApply.length === 0) return;

    setPhase("applying");
    setApplyError(null);

    try {
      const items = toApply.map((m) => {
        if (m.confidence === "new-order") {
          const refundStatus =
            m.row.amountRefundedCents === 0            ? "none"
            : m.row.amountRefundedCents >= m.row.amountCents ? "full"
            : "partial";
          return {
            type:                "new-order",
            chargeId:            m.row.chargeId,
            checkoutSessionId:   m.row.checkoutSessionId,
            paymentIntentId:     m.row.paymentIntentId,
            createdAt:           m.row.createdAt.toISOString(),
            amountCents:         m.row.amountCents,
            amountRefundedCents: m.row.amountRefundedCents,
            currency:            m.row.currency,
            customerEmail:       m.row.customerEmail,
            customerName:        m.row.customerName,
            description:         m.row.description,
            orderSummary:        m.row.orderSummary,
            orderDataJson:       m.row.orderDataJson,
            orderKind:           detectStripeOrderKind(m.row),
            clsItems:            parseCLSItems(m.row.checkoutLineItemSummary || m.row.orderSummary),
            refundStatus,
          };
        }
        const refundStatus =
          m.row.amountRefundedCents === 0            ? "none"
          : m.row.amountRefundedCents >= m.row.amountCents ? "full"
          : "partial";
        return {
          type:              "update-refund",
          orderId:           m.selectedOrderId!,
          refundAmountCents: m.row.amountRefundedCents,
          refundStatus,
        };
      });

      const res  = await fetch("/api/admin/orders/stripe-import", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok) { setApplyError(json.error ?? "Failed to apply."); setPhase("reviewing"); return; }

      setDoneCount(json.successCount ?? toApply.length);
      setPhase("done");
      onSuccess(json.successCount ?? toApply.length);
    } catch {
      setApplyError("Network error. Please try again.");
      setPhase("reviewing");
    }
  }

  // Counts
  const refundCount    = matches.filter((m) => m.confidence === "update-refund").length;
  const newOrderCount  = matches.filter((m) => m.confidence === "new-order").length;
  const reviewCount    = matches.filter((m) => m.confidence === "review").length;
  const noActionCount  = matches.filter((m) => m.confidence === "no-action" || m.confidence === "skip").length;
  const readyCount     = matches.filter((m) => !m.skipped && (m.selectedOrderId || m.confidence === "new-order")).length;
  const blockedCount   = matches.filter((m) => m.confidence === "review" && !m.skipped && !m.selectedOrderId).length;

  const filtered = activeFilter === "all" ? matches
    : activeFilter === "no-action" ? matches.filter((m) => m.confidence === "no-action" || m.confidence === "skip")
    : matches.filter((m) => m.confidence === activeFilter);

  const tabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: "all",           label: "All",           count: matches.length, color: "gray"   },
    { key: "update-refund", label: "Refund updates", count: refundCount,   color: "amber"  },
    { key: "new-order",     label: "New orders",     count: newOrderCount, color: "green"  },
    { key: "review",        label: "Needs Review",   count: reviewCount,   color: "amber"  },
    { key: "no-action",     label: "No action",      count: noActionCount, color: "gray"   },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={phase === "done" ? onClose : undefined} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Import from Stripe</h2>
            <p className="text-xs text-gray-400 mt-0.5">Handles refunds, partial refunds, and orders placed outside the website</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
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
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 space-y-1">
                    <p className="font-medium">Export instructions</p>
                    <ol className="list-decimal list-inside text-xs space-y-0.5 text-blue-700">
                      <li>Go to Stripe Dashboard → Payments</li>
                      <li>Click Export → Download CSV (or use the Reports section)</li>
                      <li>Upload the .csv or .xlsx file below</li>
                    </ol>
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{allOrders.length} existing orders</span> loaded for matching.
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <p className="text-sm text-gray-500 mb-3">Select your Stripe Payments export (.csv or .xlsx)</p>
                    <label className="cursor-pointer">
                      <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="sr-only" onChange={handleFileChange} />
                      <span className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors inline-block">
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
                {tabs.map((tab) => {
                  const isActive = activeFilter === tab.key;
                  const colorMap: Record<string, string> = {
                    green: isActive ? "bg-green-600 text-white" : "bg-green-100 text-green-800 hover:bg-green-200",
                    amber: isActive ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200",
                    gray:  isActive ? "bg-gray-700 text-white"  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
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
              {matches.length === 0 && <p className="text-sm text-gray-500">No rows found in the file.</p>}

              <div className="space-y-2">
                {filtered.length === 0 && matches.length > 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No rows in this category.</p>
                )}

                {filtered.map((m) => {
                  // ── No action / failed ─────────────────────────────────────
                  if (m.confidence === "no-action" || m.confidence === "skip") {
                    const order = m.candidates[0];
                    return (
                      <div key={m.rowIndex} className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2 flex items-center gap-2">
                        <span className="text-gray-300">—</span>
                        <span className="font-mono">{m.row.chargeId}</span>
                        {m.row.customerEmail && <span className="text-gray-400">({m.row.customerEmail})</span>}
                        <span className="ml-auto">{order ? "Already up to date" : "No match"}</span>
                      </div>
                    );
                  }

                  // ── Refund update ──────────────────────────────────────────
                  if (m.confidence === "update-refund") {
                    const order = m.candidates[0];
                    const newRefundStatus =
                      m.row.amountRefundedCents === 0 ? "none"
                      : m.row.amountRefundedCents >= m.row.amountCents ? "full"
                      : "partial";
                    return (
                      <div key={m.rowIndex} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 text-xs space-y-0.5">
                            <p className="font-semibold text-amber-700">Refund update</p>
                            <div className="text-gray-700 grid grid-cols-2 gap-x-4">
                              <div><span className="text-gray-400">Customer: </span>{m.row.customerEmail || "—"}</div>
                              <div><span className="text-gray-400">Charge: </span>{fmtMoney(m.row.amountCents, m.row.currency)}</div>
                              <div><span className="text-gray-400">Refunded: </span>
                                <span className={`rounded-full px-1.5 py-0.5 font-medium ${REFUND_BADGE[newRefundStatus]}`}>
                                  {fmtMoney(m.row.amountRefundedCents, m.row.currency)} ({newRefundStatus})
                                </span>
                              </div>
                              {order && <div><span className="text-gray-400">Order: </span>{order.order_summary ?? "—"}</div>}
                            </div>
                          </div>
                          <button
                            onClick={() => updateMatch(m.rowIndex, { skipped: !m.skipped })}
                            className={`shrink-0 text-xs px-2 py-1 rounded-md border transition-colors ${
                              m.skipped ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {m.skipped ? "Skipped" : "Skip"}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // ── New order ──────────────────────────────────────────────
                  if (m.confidence === "new-order") {
                    return (
                      <div key={m.rowIndex} className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 text-xs space-y-0.5">
                            <p className="font-semibold text-green-700">New order</p>
                            <div className="text-gray-700 grid grid-cols-2 gap-x-4">
                              <div><span className="text-gray-400">Customer: </span>{m.row.customerName || m.row.customerEmail || "—"}</div>
                              <div><span className="text-gray-400">Amount: </span>{fmtMoney(m.row.amountCents, m.row.currency)}</div>
                              <div><span className="text-gray-400">Date: </span>{fmtDate(m.row.createdAt.toISOString())}</div>
                              <div><span className="text-gray-400">Status: </span>{m.row.status}</div>
                              {m.row.description && <div className="col-span-2"><span className="text-gray-400">Desc: </span>{m.row.description}</div>}
                            </div>
                          </div>
                          <button
                            onClick={() => updateMatch(m.rowIndex, { skipped: !m.skipped })}
                            className={`shrink-0 text-xs px-2 py-1 rounded-md border transition-colors ${
                              m.skipped ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {m.skipped ? "Skipped" : "Skip"}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // ── Needs review (multiple candidates) ─────────────────────
                  return (
                    <div key={m.rowIndex} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">Needs Review</p>
                      <div className="text-xs text-gray-700 mb-2 space-y-0.5">
                        <div><span className="text-gray-400">Email: </span>{m.row.customerEmail || "—"} · <span className="text-gray-400">Amount: </span>{fmtMoney(m.row.amountCents, m.row.currency)} · <span className="text-gray-400">Date: </span>{fmtDate(m.row.createdAt.toISOString())}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={m.selectedOrderId ?? ""}
                          onChange={(e) => updateMatch(m.rowIndex, { selectedOrderId: e.target.value || null, skipped: false })}
                          className="flex-1 text-xs border border-amber-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="">— Select an order —</option>
                          {m.candidates.map((c) => (
                            <option key={c.id} value={c.id}>{candidateLabel(c)}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateMatch(m.rowIndex, { skipped: !m.skipped })}
                          className={`shrink-0 text-xs px-2 py-1.5 rounded-md border transition-colors ${
                            m.skipped ? "bg-gray-100 text-gray-500 border-gray-200" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {m.skipped ? "Skipped" : "Skip"}
                        </button>
                      </div>
                      {/* Manual order ID for unmatched */}
                      {m.candidates.length === 0 && !m.skipped && (
                        <input
                          type="text"
                          placeholder="Or enter order ID manually…"
                          value={manualIds[m.rowIndex] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualIds((prev) => ({ ...prev, [m.rowIndex]: val }));
                            updateMatch(m.rowIndex, { selectedOrderId: val.trim() || null });
                          }}
                          className="mt-2 w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {phase === "applying" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Applying updates…</p>
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Done!</p>
                <p className="text-sm text-gray-500 mt-1">{doneCount} item{doneCount !== 1 ? "s" : ""} processed.</p>
              </div>
              <button onClick={onClose} className="px-6 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
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
                <span className="text-amber-600 font-medium">{blockedCount} review row{blockedCount !== 1 ? "s" : ""} need a selection.</span>
              )}
            </div>
            <button
              onClick={handleApply}
              disabled={readyCount === 0 || blockedCount > 0}
              className="px-5 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Apply {readyCount} change{readyCount !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
