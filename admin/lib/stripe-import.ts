// lib/stripe-import.ts
// Parses Stripe Payments CSV/XLSX exports and matches rows to existing orders.
// No "use client" — safe on server or client.

export type StripeRow = {
  chargeId:                 string;
  checkoutSessionId:        string;  // cs_xxx — direct match to orders.stripe_session_id
  paymentIntentId:          string;  // pi_xxx — secondary match key
  createdAt:                Date;
  amountCents:              number;
  amountRefundedCents:      number;
  currency:                 string;
  status:                   string;  // Paid | Refunded | Partially refunded
  declineReason:            string;  // non-empty = failed charge
  customerEmail:            string;
  customerName:             string;  // from Shipping Name
  description:              string;
  checkoutLineItemSummary:  string;  // e.g. "SkyBall 3-Pack (1); Partners Pack – Pro Kit (1)"
  // Metadata (populated for orders placed through our website checkout)
  orderSummary:             string;
  orderDataJson:            string;
  orderItemsJson:           string;
};

export type StripeCandidateOrder = {
  id:                       string;
  customer_name:            string | null;
  customer_email:           string | null;
  created_at:               string;
  order_total_cents:        number | null;
  order_currency:           string;
  order_summary:            string | null;
  fulfillment_status:       string;
  stripe_payment_intent_id: string | null;
  stripe_session_id:        string;
  refund_amount_cents:      number;
  refund_status:            string;
};

export type StripeMatchConfidence =
  | "update-refund"    // matched order, has refund changes to apply
  | "new-order"        // no match, will create (includes missed-webhook orders)
  | "review"           // multiple email candidates, user must choose
  | "no-action"        // matched, already current
  | "skip";            // failed/declined charge — never import

export type StripeRowMatch = {
  row:             StripeRow;
  rowIndex:        number;
  confidence:      StripeMatchConfidence;
  candidates:      StripeCandidateOrder[];
  selectedOrderId: string | null;
  skipped:         boolean;
};

// ─── Column normalizer ────────────────────────────────────────────────────────

function nk(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function col(row: Record<string, unknown>, ...names: string[]): unknown {
  const norm = Object.keys(row).reduce<Record<string, unknown>>((acc, k) => {
    acc[nk(k)] = row[k];
    return acc;
  }, {});
  for (const n of names) {
    if (nk(n) in norm) return norm[nk(n)];
  }
  return undefined;
}

function parseDollars(raw: unknown): number {
  if (typeof raw === "number") return Math.round(raw * 100);
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(/[$,\s]/g, ""));
    return isNaN(n) ? 0 : Math.round(n * 100);
  }
  return 0;
}

// xlsx reads Stripe CSV date cells as Excel serial numbers (float days since 1900-01-00).
// 25569 = days between Excel epoch and Unix epoch (1970-01-01).
const EXCEL_EPOCH_OFFSET_DAYS = 25569;
const MS_PER_DAY = 86400000;

function parseStripeDate(raw: unknown): Date {
  // Excel serial number — the primary format xlsx returns for Stripe CSV dates
  if (typeof raw === "number") {
    return new Date((raw - EXCEL_EPOCH_OFFSET_DAYS) * MS_PER_DAY);
  }
  // Date object (returned by xlsx for explicitly-typed date cells in .xlsx files)
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  // Fallback: string parsing for M/D/YY H:MM or ISO formats
  if (typeof raw === "string") {
    const s = raw.trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/);
    if (m) {
      let year = Number(m[3]);
      if (year < 100) year += 2000;
      return new Date(Date.UTC(year, Number(m[1]) - 1, Number(m[2]), Number(m[4]), Number(m[5])));
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

// ─── parseStripeRows ──────────────────────────────────────────────────────────

export function parseStripeRows(rawRows: Record<string, unknown>[]): StripeRow[] {
  const results: StripeRow[] = [];

  for (const row of rawRows) {
    const chargeId = String(col(row, "id", "payment id", "charge id") ?? "").trim();
    if (!chargeId) continue;

    // Skip failed/declined charges immediately
    const declineReason = String(col(row, "Decline Reason", "decline reason", "declinereason") ?? "").trim();
    const status = String(col(row, "Status", "charge status") ?? "").trim();
    const statusLower = status.toLowerCase();

    // Only process successful charges (paid, refunded, partially refunded)
    const isSuccessful =
      statusLower === "paid" ||
      statusLower === "refunded" ||
      statusLower === "partially refunded";

    if (!isSuccessful || declineReason) continue;

    const checkoutSessionId = String(
      col(row, "Checkout Session ID", "checkout session id", "checkoutsessionid", "session id") ?? ""
    ).trim();

    const paymentIntentId = String(
      col(row, "PaymentIntent ID", "payment intent id", "paymentintentid") ?? ""
    ).trim();

    const createdAt = parseStripeDate(
      col(row, "Created date (UTC)", "Created (UTC)", "created date", "created", "date")
    );

    const amountCents        = parseDollars(col(row, "Amount", "amount"));
    const amountRefundedCents = parseDollars(col(row, "Amount Refunded", "amount refunded"));
    const currency = String(col(row, "Currency", "currency") ?? "usd").trim().toLowerCase();

    // Prefer Customer Description (account-level, tied to the buyer's email) over
    // Shipping Name (which may be a gift recipient, not the actual buyer).
    const customerName = String(
      col(row, "Customer Description", "customer description", "customer name",
          "Card Name", "card name", "Shipping Name", "shipping name", "name") ?? ""
    ).trim();

    const customerEmail = String(
      col(row, "Customer Email", "customer email", "email") ?? ""
    ).trim().toLowerCase();

    const description = String(
      col(row, "Description", "description") ?? ""
    ).trim();

    const checkoutLineItemSummary = String(
      col(row, "Checkout Line Item Summary", "checkoutlineitemsummary", "line item summary") ?? ""
    ).trim();

    // Metadata columns (only present for website checkout orders)
    const orderSummary  = String(col(row, "order_summary (metadata)", "ordersummarymetadata", "order_summary") ?? "").trim();
    const orderDataJson = String(col(row, "order_data_json (metadata)", "orderdatajsonmetadata", "order_data_json") ?? "").trim();
    const orderItemsJson = String(col(row, "order_items_json (metadata)", "orderitemsjsonmetadata", "order_items_json") ?? "").trim();

    results.push({
      chargeId, checkoutSessionId, paymentIntentId, createdAt,
      amountCents, amountRefundedCents, currency,
      status, declineReason,
      customerEmail, customerName, description,
      checkoutLineItemSummary,
      orderSummary, orderDataJson, orderItemsJson,
    });
  }

  return results;
}

// ─── CLS parsing + event detection ───────────────────────────────────────────

/** Parses "Product Name (qty); Other Product (qty)" into structured items. */
export function parseCLSItems(cls: string): { product_name: string; quantity: number }[] {
  if (!cls.trim()) return [];
  return cls.split(";").flatMap((part) => {
    const m = part.trim().match(/^(.+?)\s*\((\d+)\)$/);
    if (!m) return [];
    return [{ product_name: m[1].trim(), quantity: parseInt(m[2], 10) }];
  });
}

/** Detects whether a Stripe row is an event registration (tournament or open play). */
export function detectStripeOrderKind(row: StripeRow): "product" | "tournament" | "open_play" {
  const combined = [row.orderSummary, row.description, row.checkoutLineItemSummary]
    .join(" ").toLowerCase();
  if (/open.?play/i.test(combined))  return "open_play";
  if (/entry fee/i.test(combined))   return "tournament";
  return "product";
}

// ─── matchStripeRows ──────────────────────────────────────────────────────────

function refundStatusFor(refundedCents: number, totalCents: number): "none" | "partial" | "full" {
  if (refundedCents <= 0) return "none";
  if (refundedCents >= totalCents) return "full";
  return "partial";
}

export function matchStripeRows(
  rows: StripeRow[],
  orders: StripeCandidateOrder[]
): StripeRowMatch[] {
  // Index by checkout session ID (primary — direct match to our stripe_session_id)
  const bySessionId = new Map<string, StripeCandidateOrder>();
  // Index by payment intent ID (secondary)
  const byPI        = new Map<string, StripeCandidateOrder>();
  // Index by already-imported charge (tertiary)
  const byCharge    = new Map<string, StripeCandidateOrder>();
  // Index by email for fallback
  const byEmail     = new Map<string, StripeCandidateOrder[]>();

  for (const o of orders) {
    if (o.stripe_session_id) bySessionId.set(o.stripe_session_id, o);
    if (o.stripe_payment_intent_id) byPI.set(o.stripe_payment_intent_id, o);
    if (o.stripe_session_id.startsWith("imported_")) {
      byCharge.set(o.stripe_session_id.replace("imported_", ""), o);
    }
    if (o.customer_email) {
      const key = o.customer_email.toLowerCase();
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key)!.push(o);
    }
  }

  const results: StripeRowMatch[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // Find matching order: session ID → PI → charge fallback
    const matched: StripeCandidateOrder | null =
      (row.checkoutSessionId ? bySessionId.get(row.checkoutSessionId) : undefined) ??
      (row.paymentIntentId   ? byPI.get(row.paymentIntentId)          : undefined) ??
      byCharge.get(row.chargeId) ??
      null;

    if (matched) {
      const newRefundCents  = row.amountRefundedCents;
      const newRefundStatus = refundStatusFor(newRefundCents, row.amountCents);
      const needsUpdate =
        matched.refund_amount_cents !== newRefundCents ||
        matched.refund_status       !== newRefundStatus;

      results.push({
        row, rowIndex,
        confidence:      needsUpdate ? "update-refund" : "no-action",
        candidates:      [matched],
        selectedOrderId: matched.id,
        skipped:         !needsUpdate,
      });
      continue;
    }

    // No direct match — try email + amount within same day
    if (row.customerEmail) {
      const dayStart = new Date(row.createdAt);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(row.createdAt);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const candidates = (byEmail.get(row.customerEmail) ?? []).filter((o) => {
        const created = new Date(o.created_at);
        const amt     = o.order_total_cents ?? 0;
        return (
          created >= dayStart &&
          created <= dayEnd   &&
          Math.abs(amt - row.amountCents) <= 1 &&
          o.fulfillment_status !== "cancelled"
        );
      });

      if (candidates.length === 1) {
        const m = candidates[0];
        const newRefundStatus = refundStatusFor(row.amountRefundedCents, row.amountCents);
        const needsUpdate =
          m.refund_amount_cents !== row.amountRefundedCents ||
          m.refund_status       !== newRefundStatus;
        results.push({
          row, rowIndex,
          confidence:      needsUpdate ? "update-refund" : "no-action",
          candidates,
          selectedOrderId: m.id,
          skipped:         !needsUpdate,
        });
        continue;
      }

      if (candidates.length > 1) {
        results.push({ row, rowIndex, confidence: "review", candidates, selectedOrderId: null, skipped: false });
        continue;
      }
    }

    // No match — create as new order
    results.push({ row, rowIndex, confidence: "new-order", candidates: [], selectedOrderId: null, skipped: false });
  }

  return results;
}
