"use client";

// Slide-over drill-down for any dashboard metric.
//
// Holds a breadcrumb stack of levels — metric → order → customer → order … —
// so you can follow the data wherever it leads without losing your place. The
// dashboard stays visible behind the drawer.
//
// The panel never re-derives a metric: it is handed the exact order ids the
// aggregate was built from, so what it shows always reconciles with the number
// that was clicked.

import { useCallback, useEffect, useState } from "react";
import { X, ChevronRight, ArrowLeft, CalendarDays, ChevronDown } from "lucide-react";
import FulfillForm, { type TrackingEntry } from "@/components/fulfill-form";
import { buildCsv, triggerCsvDownload } from "@/lib/csv-export";
import type { OrderData, OrderDataItem, ShippingAddress } from "@/lib/order-types";
import type { Focus } from "@/lib/analytics-utils";
import {
  DATE_PRESETS, presetToDates,
  type AnalyticsFilterState, type DatePreset,
} from "@/components/analytics-filters";

// ── Types ──────────────────────────────────────────────────────────────────

export type DrillOrder = {
  id: string;
  stripe_session_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: Record<string, unknown> | null;
  order_data: Record<string, unknown> | null;
  order_summary: string | null;
  order_total_cents: number | null;
  order_currency: string | null;
  fulfillment_status: "pending" | "processing" | "fulfilled" | "cancelled";
  tracking_number: string | null;
  tracking_numbers: TrackingEntry[] | null;
  internal_notes: string | null;
  shipping_label_cost: number | null;
  stripe_fee_cents: number | null;
  refund_amount_cents: number | null;
  refund_status: string | null;
  created_at: string;
  fulfilled_at: string | null;
};

/** One contributor to a metric — e.g. the SKU a base unit came from. */
export type DrillBreakdownRow = {
  name: string;
  /** Primary figure for this contributor (units, orders, whatever the metric counts). */
  value: number;
  valueLabel: string;
  orders: number;
  orderIds: string[];
};

/** What was clicked: a metric row and the orders behind it. */
export type DrillTarget = {
  /**
   * Stable identity for the clicked row. Lets the panel re-resolve itself when
   * the dashboard's date range changes underneath it, instead of going stale.
   */
  key?: string;
  title: string;
  subtitle?: string;
  orderIds: string[];
  /** Set when the metric maps to a dashboard filter dimension. */
  focus?: Focus;
  /** Optional "what made up this number" list, shown above the orders. */
  breakdown?: DrillBreakdownRow[];
  breakdownTitle?: string;
  /** Open straight at this order rather than the contributing-orders list. */
  openOrderId?: string;
};

/**
 * Resolve a row's index list against the response's id table.
 *
 * Every tab builds its drill targets through this, so the panel always opens
 * the exact orders the aggregate was computed from — never a re-derived set.
 */
export function makeTarget(
  allIds: string[] | undefined,
  idx: number[] | undefined,
  title: string,
  subtitle?: string,
  focus?: Focus
): DrillTarget {
  const ids = (idx ?? [])
    .map((i) => (allIds ?? [])[i])
    .filter((v): v is string => Boolean(v));
  return { title, subtitle, orderIds: ids, focus };
}

// The metric level reads its target from props rather than capturing it, so a
// re-emitted target (same row, new date range) refreshes in place.
type Level =
  | { kind: "metric" }
  | { kind: "order"; orderId: string; label: string }
  | { kind: "customer"; email: string; label: string };

type Props = {
  target: DrillTarget | null;
  onClose: () => void;
  onApplyFocus?: (focus: Focus, label: string) => void;
  /** The dashboard's current range — shown and editable in the panel header. */
  filters?: AnalyticsFilterState;
  onFiltersChange?: (f: AnalyticsFilterState) => void;
};

// ── Formatting ─────────────────────────────────────────────────────────────

function fmtMoney(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
    .format((cents ?? 0) / 100);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/** Breadcrumb label for an order — dated, so it never reads the same as the
 *  customer crumb it sits next to. */
function orderLabel(o: DrillOrder): string {
  return `Order · ${new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** Compact description of the active range, e.g. "Jan 1 – Aug 3, 2026". */
function rangeLabel(f: AnalyticsFilterState): string {
  const preset = DATE_PRESETS.find((p) => p.value === f.preset);
  if (f.preset !== "custom" && preset) return preset.label;
  if (!f.from && !f.to) return "All time";
  return `${fmtDate(f.from)} – ${fmtDate(f.to)}`;
}

function items(order: DrillOrder): OrderDataItem[] {
  return ((order.order_data as OrderData | null)?.items) ?? [];
}

function addressLines(order: DrillOrder): string[] {
  const a = order.shipping_address as ShippingAddress | null;
  if (!a) return [];
  return [
    a.line1 ?? "",
    a.line2 ?? "",
    [a.city, a.state, a.postal_code].filter(Boolean).join(", "),
    a.country ?? "",
  ].filter((s) => s.trim().length > 0);
}

const STATUS_STYLES: Record<string, string> = {
  fulfilled:  "bg-green-100 text-green-700",
  processing: "bg-blue-100 text-blue-700",
  pending:    "bg-yellow-100 text-yellow-700",
  cancelled:  "bg-gray-100 text-gray-500",
};

// ── Panel ──────────────────────────────────────────────────────────────────

export default function DrillPanel({
  target, onClose, onApplyFocus, filters, onFiltersChange,
}: Props) {
  const [stack,   setStack]   = useState<Level[]>([]);
  const [orders,  setOrders]  = useState<DrillOrder[]>([]);
  const [custOrders, setCustOrders] = useState<DrillOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [showDates, setShowDates] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  // Reset the stack whenever a new metric is drilled. A target carrying an
  // openOrderId (a row that IS an order) skips the list entirely.
  //
  // Keyed on target.key where present, so a re-emitted target — the same row
  // rebuilt after a date change — refreshes the data without throwing away the
  // level the reader had navigated to.
  const targetKey = target?.key ?? target?.title ?? null;
  useEffect(() => {
    if (!target) { setStack([]); return; }
    setStack(
      target.openOrderId
        ? [{ kind: "metric" }, { kind: "order", orderId: target.openOrderId, label: target.title }]
        : [{ kind: "metric" }]
    );
    setCustOrders([]);
    setSource(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const fetchOrders = useCallback(async (body: { ids?: string[]; email?: string }) => {
    const res = await fetch("/api/admin/orders/by-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load orders.");
    return (json.orders ?? []) as DrillOrder[];
  }, []);

  const loadOrders = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setOrders([]); return; }
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchOrders({ ids }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  // Keyed on the id list rather than the object, so a parent re-render doesn't
  // refetch but a genuinely different order set does.
  const idsKey = (target?.orderIds ?? []).join(",");
  useEffect(() => {
    if (target) void loadOrders(target.orderIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  // A customer reached through one metric still gets their real lifetime
  // record, not just the orders that metric happened to include.
  const customerEmail = stack[stack.length - 1]?.kind === "customer"
    ? (stack[stack.length - 1] as { email: string }).email
    : null;

  useEffect(() => {
    if (!customerEmail) return;
    let cancelled = false;
    setLoading(true);
    fetchOrders({ email: customerEmail })
      .then((rows) => { if (!cancelled) { setCustOrders(rows); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load customer."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customerEmail, fetchOrders]);

  // Escape closes the drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (target) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  if (!target) return null;

  const level = stack[stack.length - 1];
  const push = (l: Level) => setStack((s) => [...s, l]);
  const popTo = (i: number) => setStack((s) => s.slice(0, i + 1));

  /** Orders shown at the current level. */
  const levelOrders = level?.kind === "customer" ? custOrders : orders;

  /** An order may have been reached from either list. */
  const findOrder = (id: string) =>
    orders.find((o) => o.id === id) ?? custOrders.find((o) => o.id === id);

  function exportCsv(rows: DrillOrder[], name: string) {
    triggerCsvDownload(
      buildCsv(
        ["Order", "Date", "Customer", "Email", "Status", "Total", "Shipping cost", "Country", "Items"],
        rows.map((o) => [
          o.id,
          o.created_at.slice(0, 10),
          o.customer_name ?? "",
          o.customer_email ?? "",
          o.fulfillment_status,
          ((o.order_total_cents ?? 0) / 100).toFixed(2),
          (o.shipping_label_cost ?? 0).toFixed(2),
          ((o.shipping_address as ShippingAddress | null)?.country) ?? "",
          items(o).map((i) => `${i.quantity ?? 1}× ${i.product_name ?? "?"}`).join("; "),
        ])
      ),
      `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <aside
        className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Drill-down details"
      >
        {/* Header + breadcrumb */}
        <header className="shrink-0 border-b border-gray-200 px-5 py-3">
          <div className="flex items-start justify-between gap-3">
            <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-gray-400">
              {stack.map((l, i) => {
                const label = l.kind === "metric" ? target.title : l.label;
                const last = i === stack.length - 1;
                return (
                  <span key={i} className="flex items-center gap-1 min-w-0">
                    {i > 0 && <ChevronRight size={12} className="shrink-0" />}
                    <button
                      onClick={() => popTo(i)}
                      disabled={last}
                      className={`truncate max-w-[16rem] ${
                        last ? "font-semibold text-gray-900" : "hover:text-sky-600 transition-colors"
                      }`}
                    >
                      {label}
                    </button>
                  </span>
                );
              })}
            </nav>
            <button
              onClick={onClose}
              className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {stack.length > 1 && (
              <button
                onClick={() => setStack((s) => s.slice(0, -1))}
                className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-sky-600"
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}

            {/* The range these numbers were computed over — visible, and
                editable without leaving the drawer. */}
            {filters && (
              <button
                onClick={() => setShowDates((v) => !v)}
                className="flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-0.5
                           text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                title="Change the date range for the whole dashboard"
              >
                <CalendarDays size={12} />
                {rangeLabel(filters)}
                <ChevronDown size={12} className={showDates ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>
            )}
          </div>

          {filters && onFiltersChange && showDates && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="flex flex-wrap gap-1">
                {DATE_PRESETS.filter((p) => p.value !== "custom").map((p) => (
                  <button
                    key={p.value}
                    onClick={() => onFiltersChange({ ...filters, preset: p.value, ...presetToDates(p.value) })}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      filters.preset === p.value
                        ? "bg-sky-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="date"
                  value={(filters.from ?? "").slice(0, 10)}
                  onChange={(e) => e.target.value && onFiltersChange({
                    ...filters, preset: "custom" as DatePreset,
                    from: new Date(`${e.target.value}T00:00:00`).toISOString(),
                  })}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700"
                  aria-label="Start date"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={(filters.to ?? "").slice(0, 10)}
                  onChange={(e) => e.target.value && onFiltersChange({
                    ...filters, preset: "custom" as DatePreset,
                    to: new Date(`${e.target.value}T23:59:59.999`).toISOString(),
                  })}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700"
                  aria-label="End date"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Applies to the whole dashboard.</p>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <p className="m-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <div className="space-y-2 p-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : level?.kind === "metric" ? (
            <MetricLevel
              target={target}
              orders={orders}
              source={source}
              onSelectSource={setSource}
              onOpenOrder={(o) => push({ kind: "order", orderId: o.id, label: orderLabel(o) })}
              onExport={(rows) => exportCsv(rows, target.title)}
              onApplyFocus={
                target.focus && onApplyFocus
                  ? () => { onApplyFocus(target.focus!, target.title); onClose(); }
                  : undefined
              }
            />
          ) : level?.kind === "order" ? (
            <OrderLevel
              order={findOrder(level.orderId)}
              onOpenCustomer={(email, label) => push({ kind: "customer", email, label })}
              onSaved={() => void loadOrders(target.orderIds)}
            />
          ) : level?.kind === "customer" ? (
            <CustomerLevel
              email={level.email}
              orders={levelOrders}
              onOpenOrder={(o) => push({ kind: "order", orderId: o.id, label: orderLabel(o) })}
              onExport={() => exportCsv(levelOrders, level.email)}
            />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

// ── Level: metric ──────────────────────────────────────────────────────────

function MetricLevel({
  target, orders, source, onSelectSource, onOpenOrder, onExport, onApplyFocus,
}: {
  target: DrillTarget;
  orders: DrillOrder[];
  source: string | null;
  onSelectSource: (name: string | null) => void;
  onOpenOrder: (o: DrillOrder) => void;
  onExport: (rows: DrillOrder[]) => void;
  onApplyFocus?: () => void;
}) {
  const active = target.breakdown?.find((b) => b.name === source) ?? null;

  // Selecting a contributor narrows the order list to just its orders.
  const shown = active
    ? orders.filter((o) => active.orderIds.includes(o.id))
    : orders;

  const totalCents    = shown.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const shippingCents = Math.round(shown.reduce((s, o) => s + (o.shipping_label_cost ?? 0) * 100, 0));

  return (
    <div>
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contributing orders</p>
        <p className="mt-1 text-sm text-gray-600">
          {target.subtitle ?? `${orders.length} order${orders.length !== 1 ? "s" : ""}`}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span><strong className="text-gray-900">{shown.length}</strong> orders</span>
          <span>Revenue <strong className="text-gray-900">{fmtMoney(totalCents)}</strong></span>
          {shippingCents > 0 && (
            <span>Shipping <strong className="text-gray-900">{fmtMoney(shippingCents)}</strong></span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {onApplyFocus && (
            <button
              onClick={onApplyFocus}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700"
            >
              Filter dashboard to this
            </button>
          )}
          <button
            onClick={() => onExport(shown)}
            disabled={shown.length === 0}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Where the number came from — e.g. which products produced these
          base units. Selecting one filters the order list below. */}
      {target.breakdown && target.breakdown.length > 0 && (
        <div className="border-b border-gray-100 px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {target.breakdownTitle ?? "Came from"}
            </p>
            {active && (
              <button
                onClick={() => onSelectSource(null)}
                className="text-xs text-sky-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <ul className="space-y-0.5">
            {target.breakdown.map((b) => {
              const on = b.name === source;
              return (
                <li key={b.name}>
                  <button
                    onClick={() => onSelectSource(on ? null : b.name)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                      on ? "bg-sky-50 ring-1 ring-inset ring-sky-200" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-gray-700">{b.name}</span>
                    <span className="shrink-0 tabular-nums text-xs text-gray-400">
                      {b.orders} order{b.orders !== 1 ? "s" : ""}
                    </span>
                    <span className="shrink-0 tabular-nums text-sm font-medium text-gray-900">
                      {b.value.toLocaleString()}
                      <span className="ml-1 text-xs font-normal text-gray-400">{b.valueLabel}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <OrderList orders={shown} onOpen={onOpenOrder} />
    </div>
  );
}

// ── Level: order ───────────────────────────────────────────────────────────

function OrderLevel({
  order, onOpenCustomer, onSaved,
}: {
  order: DrillOrder | undefined;
  onOpenCustomer: (email: string, label: string) => void;
  onSaved: () => void;
}) {
  if (!order) {
    return <p className="p-5 text-sm text-gray-400">Order not found.</p>;
  }

  const addr = addressLines(order);

  return (
    <div className="space-y-5 p-5">
      {/* Summary */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{order.customer_name ?? "Unknown"}</p>
            {order.customer_email && (
              <button
                onClick={() => onOpenCustomer(order.customer_email!.toLowerCase(), order.customer_name ?? order.customer_email!)}
                className="truncate text-xs text-sky-600 hover:underline"
              >
                {order.customer_email} →
              </button>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.fulfillment_status] ?? "bg-gray-100 text-gray-600"}`}>
              {order.fulfillment_status}
            </span>
            <a
              href={`/fulfillment/${order.id}?from=sales`}
              className="whitespace-nowrap text-xs text-gray-400 hover:text-sky-600 hover:underline"
            >
              Open full order ↗
            </a>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <Field label="Ordered"       value={fmtDate(order.created_at)} />
          <Field label="Fulfilled"     value={fmtDate(order.fulfilled_at)} />
          <Field label="Order total"   value={fmtMoney(order.order_total_cents)} />
          <Field label="Shipping cost" value={order.shipping_label_cost != null ? fmtMoney(order.shipping_label_cost * 100) : "—"} />
          {order.stripe_fee_cents != null && order.stripe_fee_cents > 0 && (
            <Field label="Stripe fee" value={fmtMoney(order.stripe_fee_cents)} />
          )}
          {order.customer_phone && <Field label="Phone" value={order.customer_phone} />}
        </dl>
      </div>

      {/* Items */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Items</h3>
        <ul className="space-y-1 text-sm">
          {items(order).map((it, i) => (
            <li key={i} className="flex justify-between gap-3 text-gray-700">
              <span className="min-w-0 truncate">{it.quantity ?? 1}× {it.product_name ?? it.slug ?? "?"}</span>
              <span className="shrink-0 tabular-nums text-gray-500">{fmtMoney(it.amount_total_cents)}</span>
            </li>
          ))}
          {items(order).length === 0 && <li className="text-sm text-gray-400">No line items recorded.</li>}
        </ul>
      </section>

      {/* Address */}
      {addr.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Ship to</h3>
          <address className="text-sm not-italic leading-relaxed text-gray-600">
            {addr.map((l, i) => <div key={i}>{l}</div>)}
          </address>
        </section>
      )}

      {/* Edit */}
      <section className="border-t border-gray-100 pt-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Edit order</h3>
        <FulfillForm
          key={order.id}
          orderId={order.id}
          currentStatus={order.fulfillment_status}
          currentTracking={order.tracking_number}
          currentNotes={order.internal_notes}
          currentTrackingNumbers={order.tracking_numbers ?? []}
          refundAmountCents={order.refund_amount_cents ?? 0}
          refundStatus={order.refund_status ?? "none"}
          onSaved={onSaved}
        />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-800">{value}</dd>
    </>
  );
}

// ── Level: customer ────────────────────────────────────────────────────────

function CustomerLevel({
  email, orders, onOpenOrder, onExport,
}: {
  email: string;
  orders: DrillOrder[];
  onOpenOrder: (o: DrillOrder) => void;
  onExport: () => void;
}) {
  const total = orders.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const aov   = orders.length > 0 ? Math.round(total / orders.length) : 0;
  const dates = orders.map((o) => o.created_at).sort();
  const name  = orders.find((o) => o.customer_name)?.customer_name;

  return (
    <div>
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="font-semibold text-gray-900">{name ?? email}</p>
        <p className="text-xs text-gray-500">{email}</p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Orders"      value={String(orders.length)} />
          <Stat label="Total spent" value={fmtMoney(total)} />
          <Stat label="AOV"         value={fmtMoney(aov)} />
          <Stat label="Customer since" value={fmtDate(dates[0] ?? null)} />
        </div>

        <p className="mt-2 text-xs text-gray-400">
          Lifetime totals, all dates · last order {fmtDate(dates[dates.length - 1] ?? null)}
        </p>

        <button
          onClick={onExport}
          className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <OrderList orders={orders} onOpen={onOpenOrder} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-lg font-bold leading-tight text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}

// ── Shared order list ──────────────────────────────────────────────────────

function OrderList({ orders, onOpen }: { orders: DrillOrder[]; onOpen: (o: DrillOrder) => void }) {
  if (orders.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-gray-400">No orders behind this figure.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {orders.map((o) => (
        <li key={o.id}>
          <button
            onClick={() => onOpen(o)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-sky-50/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{o.customer_name ?? o.customer_email ?? o.id.slice(0, 8)}</p>
              <p className="truncate text-xs text-gray-400">
                {fmtDate(o.created_at)}
                {o.tracking_numbers?.[0]?.number && ` · ${o.tracking_numbers[0].number}`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium tabular-nums text-gray-800">{fmtMoney(o.order_total_cents)}</p>
              {o.shipping_label_cost != null && o.shipping_label_cost > 0 && (
                <p className="text-xs tabular-nums text-gray-400">ship {fmtMoney(o.shipping_label_cost * 100)}</p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.fulfillment_status] ?? "bg-gray-100 text-gray-600"}`}>
              {o.fulfillment_status}
            </span>
            <ChevronRight size={14} className="shrink-0 text-gray-300" />
          </button>
        </li>
      ))}
    </ul>
  );
}
