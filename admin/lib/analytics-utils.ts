// lib/analytics-utils.ts
// Shared helpers for all analytics API routes.

import type { ShippingAddress, OrderData, OrderDataItem } from "./order-types";

export type Region = "all" | "domestic" | "international" | string;

export type AnalyticsOrder = {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  order_total_cents: number | null;
  order_currency: string;
  fulfillment_status: string;
  created_at: string;
  fulfilled_at: string | null;
  shipping_address: Record<string, unknown> | null;
  order_data: Record<string, unknown> | null;
  order_summary: string | null;
  shipping_label_cost: number | null;
  stripe_fee_cents: number | null;
};

export function parseRegion(param: string | null): Region {
  if (!param || param === "all") return "all";
  if (param === "domestic") return "domestic";
  if (param === "international") return "international";
  return param.toUpperCase();
}

export function orderCountry(order: AnalyticsOrder): string {
  const addr = order.shipping_address as ShippingAddress | null;
  return (addr?.country ?? "").toUpperCase().trim();
}

export function matchesRegion(order: AnalyticsOrder, region: Region): boolean {
  const c = orderCountry(order);
  if (region === "all") return true;
  if (region === "domestic") return c === "US";
  if (region === "international") return c !== "US";
  return c === region;
}

export function matchesDateRange(
  created_at: string,
  from: Date | null,
  to: Date | null
): boolean {
  const d = new Date(created_at);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function parseDateParams(
  fromStr: string | null,
  toStr: string | null
): { from: Date | null; to: Date | null } {
  const from = fromStr ? new Date(fromStr) : null;
  const to = toStr ? new Date(toStr) : null;
  return { from, to };
}

export function getPrevPeriod(
  from: Date | null,
  to: Date | null
): { prevFrom: Date | null; prevTo: Date | null } {
  if (!from) return { prevFrom: null, prevTo: null };
  const end = to ?? new Date();
  const durationMs = end.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - durationMs);
  return { prevFrom, prevTo };
}

export function getGranularity(from: Date | null, to: Date | null): "day" | "week" | "month" {
  if (!from) return "month";
  const end = to ?? new Date();
  const days = Math.ceil((end.getTime() - from.getTime()) / 864e5);
  if (days <= 31) return "day";
  if (days <= 90) return "week";
  return "month";
}

export function dateKey(d: Date, gran: "day" | "week" | "month"): string {
  if (gran === "day") return d.toISOString().slice(0, 10);
  if (gran === "week") {
    const w = new Date(d);
    w.setDate(w.getDate() - w.getDay());
    return w.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7);
}

// ── Reporting periods ──────────────────────────────────────────────────────
//
// Note: `dateKey` above buckets in UTC, which is fine for a trend line but
// wrong at month boundaries — an order placed 8pm ET on Jan 31 lands in
// February. The units report buckets in Eastern time instead, because "what
// did we sell in June" has to match the calendar month the business runs on.
// `dateKey` is left as-is so the existing revenue charts don't shift.

export type Period = "week" | "month" | "quarter" | "year";

const REPORTING_TZ = "America/New_York";

const tzFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORTING_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar y/m/d of an instant, as seen in the reporting timezone. */
function tzParts(d: Date): { y: number; m: number; d: number } {
  const [y, m, day] = tzFormatter.format(d).split("-").map(Number);
  return { y, m, d: day };
}

/** Bucket key for an instant: "2026-06", "2026-Q2", "2026", or a week's Sunday. */
export function periodKey(date: Date, period: Period): string {
  const { y, m, d } = tzParts(date);
  if (period === "year")    return String(y);
  if (period === "quarter") return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  if (period === "month")   return `${y}-${String(m).padStart(2, "0")}`;
  // Week: Sunday-start, computed on the reporting-timezone calendar date.
  const utcMidnight = Date.UTC(y, m - 1, d);
  const dow = new Date(utcMidnight).getUTCDay();
  return new Date(utcMidnight - dow * 864e5).toISOString().slice(0, 10);
}

/** Human label for a period key, e.g. "2026-06" → "Jun 2026". */
export function periodLabel(key: string, period: Period): string {
  if (period === "year" || period === "quarter") return key;
  const [y, m, d] = key.split("-");
  const monthName = MONTH_NAMES[Number(m) - 1] ?? m;
  if (period === "month") return `${monthName} ${y}`;
  return `${monthName} ${Number(d)}`;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Every period key between two instants, inclusive and gap-free, so the report
 * shows empty periods as zero rather than skipping them. Walks day by day —
 * cheap enough at these ranges and sidesteps timezone arithmetic entirely.
 */
export function enumeratePeriods(from: Date, to: Date, period: Period): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const cur = new Date(from.getTime());
  while (cur <= to) {
    const k = periodKey(cur, period);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
    cur.setTime(cur.getTime() + 864e5);
  }
  const last = periodKey(to, period);
  if (!seen.has(last)) keys.push(last);
  return keys;
}

export function fillSeries(
  raw: Map<string, { revenue: number; orders: number }>,
  from: Date,
  to: Date,
  gran: "day" | "week" | "month"
): { date: string; revenue: number; orders: number }[] {
  const result: { date: string; revenue: number; orders: number }[] = [];
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  const seen = new Set<string>();
  while (cur <= end) {
    const key = dateKey(cur, gran);
    if (!seen.has(key)) {
      seen.add(key);
      const entry = raw.get(key) ?? { revenue: 0, orders: 0 };
      result.push({ date: key, revenue: entry.revenue, orders: entry.orders });
    }
    if (gran === "day") cur.setDate(cur.getDate() + 1);
    else if (gran === "week") cur.setDate(cur.getDate() + 7);
    else cur.setMonth(cur.getMonth() + 1);
  }
  return result;
}

export function getOrderItems(order: AnalyticsOrder): OrderDataItem[] {
  const od = order.order_data as OrderData | null;
  return od?.items ?? [];
}

export type OrderKind = "product" | "tournament" | "open_play";

/** Detects whether an order is a product sale, tournament entry, or open-play registration. */
export function detectOrderKind(order: AnalyticsOrder): OrderKind {
  // 1. Check order_data.kind set by Stripe import
  const odKind = (order.order_data as Record<string, unknown> | null)?.kind as string | undefined;
  if (odKind === "tournament") return "tournament";
  if (odKind === "open_play")  return "open_play";

  // 2. Pattern-match on order_summary
  const summary = (order.order_summary ?? "").toLowerCase();
  if (/open.?play/i.test(summary))  return "open_play";
  if (/entry fee/i.test(summary))   return "tournament";

  // 3. Check item names
  for (const item of getOrderItems(order)) {
    const name = (item.product_name ?? "").toLowerCase();
    if (/open.?play/i.test(name)) return "open_play";
    if (/entry fee/i.test(name))  return "tournament";
  }

  return "product";
}

/**
 * Maps raw/historical product names to canonical display names so analytics
 * groups old and new product generations correctly.
 */
export function normalizeProductName(raw: string): string {
  const low = raw.trim().toLowerCase();

  // ── Kits ──────────────────────────────────────────────────────────────────
  if (/essentials/i.test(low)) {
    if (/\bpro\b/i.test(low))    return "Essentials Kit – Pro";
    if (/starter/i.test(low))    return "Essentials Kit – Starter";
    return "Essentials Kit (Original)";
  }
  if (/partners?.?pack/i.test(low) || /partner.?pack/i.test(low)) {
    if (/\bpro\b/i.test(low))    return "Partners Pack – Pro";
    if (/starter/i.test(low))    return "Partners Pack – Starter";
    return "Partners Pack (Original)";
  }
  if (/anywhere/i.test(low)) {
    if (/\bpro\b/i.test(low))    return "Anywhere Kit – Pro";
    if (/starter/i.test(low))    return "Anywhere Kit – Starter";
    return "Anywhere Kit (Original)";
  }

  // ── Individual rackets (not part of a kit/pack) ───────────────────────────
  if (/skyball racket/i.test(low) && !/kit|pack/i.test(low)) {
    if (/\bpro\b/i.test(low))    return "SkyBall Racket – Pro";
    if (/starter/i.test(low))    return "SkyBall Racket – Starter";
    return "SkyBall Racket (Original)";
  }

  // ── Ball packs ─────────────────────────────────────────────────────────────
  if (/3.?pack/i.test(low))  return "SkyBall 3-Pack";
  if (/8.?pack/i.test(low))  return "SkyBall 8-Pack";
  if (/12.?pack/i.test(low)) return "SkyBall 12-Pack";
  if (/30.?pack/i.test(low)) return "SkyBall 30-Pack";
  if (/50.?pack/i.test(low)) return "SkyBall 50-Pack";

  // ── Accessories ────────────────────────────────────────────────────────────
  if (/over grip/i.test(low) || /overgrip/i.test(low)) return "Professional Over Grips";
  if (/racket cover/i.test(low))                        return "Racket Cover";

  return raw.trim(); // keep original for anything unrecognised
}

export function fmtPct(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.round((a / b) * 1000) / 10;
}

export function deltaLabel(now: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((now - prev) / prev) * 1000) / 10;
}
