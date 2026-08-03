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
import { X, ChevronRight, ArrowLeft } from "lucide-react";
import FulfillForm, { type TrackingEntry } from "@/components/fulfill-form";
import { buildCsv, triggerCsvDownload } from "@/lib/csv-export";
import type { OrderData, OrderDataItem, ShippingAddress } from "@/lib/order-types";
import type { Focus } from "@/lib/analytics-utils";

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

/** What was clicked: a metric row and the orders behind it. */
export type DrillTarget = {
  title: string;
  subtitle?: string;
  orderIds: string[];
  /** Set when the metric maps to a dashboard filter dimension. */
  focus?: Focus;
};

type Level =
  | { kind: "metric"; target: DrillTarget }
  | { kind: "order"; orderId: string; label: string }
  | { kind: "customer"; email: string; label: string };

type Props = {
  target: DrillTarget | null;
  onClose: () => void;
  onApplyFocus?: (focus: Focus, label: string) => void;
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

export default function DrillPanel({ target, onClose, onApplyFocus }: Props) {
  const [stack,   setStack]   = useState<Level[]>([]);
  const [orders,  setOrders]  = useState<DrillOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Reset the stack whenever a new metric is drilled.
  useEffect(() => {
    setStack(target ? [{ kind: "metric", target }] : []);
  }, [target]);

  const loadOrders = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setOrders([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders/by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load orders.");
      setOrders(json.orders ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (target) void loadOrders(target.orderIds);
  }, [target, loadOrders]);

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
  const levelOrders =
    level?.kind === "customer"
      ? orders.filter((o) => (o.customer_email ?? "").toLowerCase() === level.email)
      : orders;

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
                const label =
                  l.kind === "metric" ? l.target.title : l.label;
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

          {stack.length > 1 && (
            <button
              onClick={() => setStack((s) => s.slice(0, -1))}
              className="mt-2 flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-sky-600"
            >
              <ArrowLeft size={12} /> Back
            </button>
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
              target={level.target}
              orders={orders}
              onOpenOrder={(o) => push({ kind: "order", orderId: o.id, label: o.customer_name ?? o.id.slice(0, 8) })}
              onExport={() => exportCsv(orders, level.target.title)}
              onApplyFocus={
                level.target.focus && onApplyFocus
                  ? () => { onApplyFocus(level.target.focus!, level.target.title); onClose(); }
                  : undefined
              }
            />
          ) : level?.kind === "order" ? (
            <OrderLevel
              order={orders.find((o) => o.id === level.orderId)}
              onOpenCustomer={(email, label) => push({ kind: "customer", email, label })}
              onSaved={() => void loadOrders(target.orderIds)}
            />
          ) : level?.kind === "customer" ? (
            <CustomerLevel
              email={level.email}
              orders={levelOrders}
              onOpenOrder={(o) => push({ kind: "order", orderId: o.id, label: `Order ${o.id.slice(0, 8)}` })}
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
  target, orders, onOpenOrder, onExport, onApplyFocus,
}: {
  target: DrillTarget;
  orders: DrillOrder[];
  onOpenOrder: (o: DrillOrder) => void;
  onExport: () => void;
  onApplyFocus?: () => void;
}) {
  const totalCents    = orders.reduce((s, o) => s + (o.order_total_cents ?? 0), 0);
  const shippingCents = Math.round(orders.reduce((s, o) => s + (o.shipping_label_cost ?? 0) * 100, 0));

  return (
    <div>
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contributing orders</p>
        <p className="mt-1 text-sm text-gray-600">
          {target.subtitle ?? `${orders.length} order${orders.length !== 1 ? "s" : ""}`}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span><strong className="text-gray-900">{orders.length}</strong> orders</span>
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
            onClick={onExport}
            disabled={orders.length === 0}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      <OrderList orders={orders} onOpen={onOpenOrder} />
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
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[order.fulfillment_status] ?? "bg-gray-100 text-gray-600"}`}>
            {order.fulfillment_status}
          </span>
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
          Within the current dashboard filters · last order {fmtDate(dates[dates.length - 1] ?? null)}
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
