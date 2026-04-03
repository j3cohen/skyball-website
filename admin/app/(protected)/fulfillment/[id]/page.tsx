// app/(protected)/fulfillment/[id]/page.tsx
// Full order detail: customer info, item breakdown, fulfillment form.

import { notFound }      from "next/navigation";
import Link              from "next/link";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import FulfillForm       from "@/components/fulfill-form";

type Customizations = {
  ball_color?: string;
  grip_colors?: string[];
  unselected_grips?: number;
  crewneck_size?: string;
  [key: string]: unknown;
};

type OrderDataItem = {
  stripe_price_id?: string;
  product_name?: string;
  quantity?: number;
  unit_amount_cents?: number;
  currency?: string;
  amount_total_cents?: number;
  customizations?: Customizations;
};

type OrderData = {
  version?: number;
  items?: OrderDataItem[];
  customer_selections?: {
    heard_about_us?: string | null;
    order_notes?: string | null;
  };
};

type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

type Order = {
  id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: ShippingAddress | null;
  order_data: OrderData;
  order_total_cents: number | null;
  order_currency: string;
  order_summary: string | null;
  fulfillment_status: "pending" | "processing" | "fulfilled" | "cancelled";
  tracking_number: string | null;
  internal_notes: string | null;
  heard_about_us: string | null;
  customer_order_notes: string | null;
  created_at: string;
  fulfilled_at: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  fulfilled:  "bg-green-100 text-green-800",
  cancelled:  "bg-gray-100 text-gray-600",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtMoney(cents: number | null | undefined, currency = "usd") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** Render the customizations object generically — handles any future keys. */
function CustomizationBadges({ c }: { c: Customizations }) {
  const entries = Object.entries(c).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([key, value]) => {
        const display = Array.isArray(value) ? value.join(", ") : String(value);
        const label   = key.replace(/_/g, " ");
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-sky-50
                       border border-sky-200 px-2 py-0.5 text-xs text-sky-800"
          >
            <span className="font-medium">{label}:</span>
            <span>{display}</span>
          </span>
        );
      })}
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();
  const order = data as Order;

  const addr    = order.shipping_address;
  const items   = order.order_data?.items ?? [];
  const selects = order.order_data?.customer_selections;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/fulfillment"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        ← Back to orders
      </Link>

      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Order {order.stripe_session_id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{fmtDate(order.created_at)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium
          ${STATUS_BADGE[order.fulfillment_status] ?? "bg-gray-100 text-gray-600"}`}>
          {order.fulfillment_status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Customer info */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Name"  value={order.customer_name} />
              <Row label="Email" value={order.customer_email} />
              <Row label="Phone" value={order.customer_phone} />
            </dl>

            {addr && (
              <>
                <h3 className="font-medium text-gray-700 mt-4 mb-1.5 text-sm">
                  Shipping address
                </h3>
                <address className="not-italic text-sm text-gray-600 leading-relaxed">
                  {addr.line1 && <div>{addr.line1}</div>}
                  {addr.line2 && <div>{addr.line2}</div>}
                  {(addr.city || addr.state || addr.postal_code) && (
                    <div>
                      {[addr.city, addr.state, addr.postal_code]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {addr.country && <div>{addr.country}</div>}
                </address>
              </>
            )}

            {(selects?.heard_about_us || order.heard_about_us) && (
              <p className="mt-3 text-xs text-gray-400">
                Heard about us via:{" "}
                <span className="font-medium text-gray-600">
                  {selects?.heard_about_us ?? order.heard_about_us}
                </span>
              </p>
            )}
            {(selects?.order_notes || order.customer_order_notes) && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <span className="font-medium">Customer note: </span>
                {selects?.order_notes ?? order.customer_order_notes}
              </div>
            )}
          </section>

          {/* Order items */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">
              Items
              <span className="ml-2 text-sm font-normal text-gray-400">
                {fmtMoney(order.order_total_cents, order.order_currency)} total
              </span>
            </h2>

            {items.length === 0 ? (
              <p className="text-sm text-gray-400">{order.order_summary ?? "No item detail available."}</p>
            ) : (
              <ul className="space-y-3">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-md bg-gray-100 flex items-center
                                    justify-center text-xs font-bold text-gray-500">
                      {item.quantity ?? "?"}×
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {item.product_name ?? item.stripe_price_id ?? "Unknown product"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {fmtMoney(item.unit_amount_cents, item.currency)} each
                        {" · "}
                        {fmtMoney(item.amount_total_cents, item.currency)} subtotal
                      </p>
                      {item.customizations &&
                        Object.keys(item.customizations).length > 0 && (
                          <CustomizationBadges c={item.customizations} />
                        )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Stripe IDs (collapsible) */}
          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer select-none hover:text-gray-600">
              Stripe reference IDs
            </summary>
            <div className="mt-2 space-y-1 pl-2 font-mono break-all">
              <div><span className="text-gray-500">Session: </span>{order.stripe_session_id}</div>
              {order.stripe_payment_intent_id && (
                <div><span className="text-gray-500">Payment intent: </span>{order.stripe_payment_intent_id}</div>
              )}
            </div>
          </details>
        </div>

        {/* ── Right column — fulfillment form ─────────────────────────── */}
        <div>
          <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm sticky top-6">
            <h2 className="font-semibold text-gray-900 mb-4">Fulfillment</h2>
            {order.fulfilled_at && (
              <p className="text-xs text-gray-400 mb-3">
                Fulfilled {fmtDate(order.fulfilled_at)}
              </p>
            )}
            <FulfillForm
              orderId={order.id}
              currentStatus={order.fulfillment_status}
              currentTracking={order.tracking_number}
              currentNotes={order.internal_notes}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <dt className="w-12 shrink-0 font-medium text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}
