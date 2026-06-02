"use client";

import { classifyBoxSize } from "@/lib/box-size";
import type { ExportableOrder, OrderData, OrderDataItem } from "@/lib/order-types";

type Props = {
  orders: ExportableOrder[];
  onClose: () => void;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getItems(order: ExportableOrder): OrderDataItem[] {
  return ((order.order_data as OrderData | null)?.items) ?? [];
}

// Parse per-item color data from order_summary when customizations are missing.
// Format: "Qty x Name ($price) [ball:orange] | Qty x Name ($price) [grips:r,r] | Total:..."
// Returns a Map keyed by normalized product name → colors.
// Name-based (not index-based) so it works even when order_data.items and
// order_summary are in different orders (Stripe line items vs original cart).
type SummaryColors = { ballColor?: string; gripColors?: string[] };
function parseSummaryColorsByName(summary: string | null): Map<string, SummaryColors> {
  const map = new Map<string, SummaryColors>();
  if (!summary) return map;
  for (const part of summary.split(" | ")) {
    if (part.startsWith("Total:")) continue;
    // Extract name: everything between "Nx " and " ($"
    const nameMatch = part.match(/^\d+x (.+?) \(\$/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim().toLowerCase();
    const out: SummaryColors = {};
    const ball = part.match(/\[ball:([^\]]+)\]/);
    if (ball)  out.ballColor  = ball[1].trim();
    const grip = part.match(/\[grips:([^\]]+)\]/);
    if (grip)  out.gripColors = grip[1].split(",").map(s => s.trim());
    map.set(name, out);
  }
  return map;
}

function itemColors(item: OrderDataItem, summaryMap: Map<string, SummaryColors>): { ball?: string; grips?: string[] } {
  const fromCustom: { ball?: string; grips?: string[] } = {
    ball:  item.customizations?.ball_color  as string   | undefined,
    grips: item.customizations?.grip_colors as string[] | undefined,
  };
  if (fromCustom.ball || fromCustom.grips) return fromCustom;
  // Fall back to summary lookup by name
  const name = (item.product_name ?? item.slug ?? "").toLowerCase();
  const fallback = summaryMap.get(name) ?? {};
  return { ball: fallback.ballColor, grips: fallback.gripColors };
}

function colorSuffix(ball?: string, grips?: string[]): string {
  const parts: string[] = [];
  if (grips?.length) parts.push(`grip: ${grips.join(", ")}`);
  if (ball)          parts.push(`ball: ${ball}`);
  return parts.length ? ` — ${parts.join(" · ")}` : "";
}

function ColorTag({ label }: { label: string }) {
  return (
    <span className="ml-1 rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px] font-medium leading-none">
      {label}
    </span>
  );
}

// ── Inventory bucket ───────────────────────────────────────────────────────

type Inv = {
  proRackets:    number;
  starterRackets: number;
  nets:          number;
  packs3Blue:    number;
  packs3Orange:  number;
  packs12Blue:   number;
  packs12Orange: number;
  packs50Blue:   number;
  packs50Orange: number;
  gripColors:    Map<string, number>; // color → individual grip count
  other:         Map<string, number>; // display name → qty
};

function makeInv(): Inv {
  return {
    proRackets: 0, starterRackets: 0, nets: 0,
    packs3Blue: 0, packs3Orange: 0,
    packs12Blue: 0, packs12Orange: 0,
    packs50Blue: 0, packs50Orange: 0,
    gripColors: new Map(),
    other: new Map(),
  };
}

function addPack(inv: Inv, size: 3 | 12 | 50, color: string | undefined, n: number) {
  const c = (color ?? "").toLowerCase();
  if (size === 3) {
    if (c === "blue")   { inv.packs3Blue   += n; return; }
    if (c === "orange") { inv.packs3Orange  += n; return; }
  } else if (size === 12) {
    if (c === "blue")   { inv.packs12Blue  += n; return; }
    if (c === "orange") { inv.packs12Orange += n; return; }
  } else {
    if (c === "blue")   { inv.packs50Blue  += n; return; }
    if (c === "orange") { inv.packs50Orange += n; return; }
  }
  // unknown color
  const key = `${size}-Pack (${color ?? "unknown color"})`;
  inv.other.set(key, (inv.other.get(key) ?? 0) + n);
}

function addItemToInv(inv: Inv, item: OrderDataItem, ball: string | undefined, grips: string[] | undefined) {
  const name        = (item.product_name ?? item.slug ?? "").toLowerCase();
  const displayName = item.product_name ?? item.slug ?? "Unknown";
  const qty         = item.quantity ?? 1;
  const isPro       = !name.includes("starter"); // default to pro unless "starter" is explicit

  // ── Kits (check most-specific first) ────────────────────────────────────
  if (name.includes("anywhere")) {
    // Anywhere Kit: 4 rackets + 2×3-packs + 1 net
    if (isPro) inv.proRackets     += 4 * qty;
    else       inv.starterRackets += 4 * qty;
    inv.nets += 1 * qty;
    addPack(inv, 3, ball, 2 * qty);
    return;
  }
  if (name.includes("partners")) {
    // Partners Pack: 4 rackets + 1×3-pack
    if (isPro) inv.proRackets     += 4 * qty;
    else       inv.starterRackets += 4 * qty;
    addPack(inv, 3, ball, 1 * qty);
    return;
  }
  if (name.includes("essentials")) {
    // Essentials Kit: 2 rackets + 1×3-pack
    if (isPro) inv.proRackets     += 2 * qty;
    else       inv.starterRackets += 2 * qty;
    addPack(inv, 3, ball, 1 * qty);
    return;
  }

  // ── Individual rackets ───────────────────────────────────────────────────
  if (name.includes("racket") && !name.includes("bag") && !name.includes("cover")) {
    if (isPro) inv.proRackets     += qty;
    else       inv.starterRackets += qty;
    return;
  }

  // ── Standalone nets ──────────────────────────────────────────────────────
  if (name.includes("net")) {
    inv.nets += qty;
    return;
  }

  // ── Grips (before ball packs — "SkyBall" in grip names contains "ball") ──
  if (name.includes("grip")) {
    const colors = grips ?? [];
    if (colors.length > 0) {
      for (const c of colors) inv.gripColors.set(c, (inv.gripColors.get(c) ?? 0) + 1);
    } else {
      inv.gripColors.set("?", (inv.gripColors.get("?") ?? 0) + qty);
    }
    return;
  }

  // ── Ball packs (largest first to avoid partial matches) ──────────────────
  if (name.includes("50-pack") || name.includes("50 pack")) {
    addPack(inv, 50, ball, qty); return;
  }
  if (name.includes("12-pack") || name.includes("12 pack")) {
    addPack(inv, 12, ball, qty); return;
  }
  if (name.includes("3-pack") || name.includes("3 pack") || name.includes("ball")) {
    addPack(inv, 3, ball, qty); return;
  }

  // ── Everything else ──────────────────────────────────────────────────────
  inv.other.set(displayName, (inv.other.get(displayName) ?? 0) + qty);
}

// Fixed display order for the inventory rows
const INV_ROWS: { label: string; key: keyof Omit<Inv, "gripColors" | "other"> }[] = [
  { label: "Pro Rackets",    key: "proRackets"    },
  { label: "Starter Rackets",key: "starterRackets" },
  { label: "Nets",           key: "nets"           },
  { label: "3-Packs Blue",   key: "packs3Blue"     },
  { label: "3-Packs Orange", key: "packs3Orange"   },
  { label: "12-Packs Blue",  key: "packs12Blue"    },
  { label: "12-Packs Orange",key: "packs12Orange"  },
  { label: "50-Packs Blue",  key: "packs50Blue"    },
  { label: "50-Packs Orange",key: "packs50Orange"  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function FulfillmentCheatSheetModal({ orders, onClose }: Props) {
  // Build inventory bucket
  const inv = makeInv();
  for (const order of orders) {
    const summaryFallbacks = parseSummaryColorsByName(order.order_summary);
    for (const item of getItems(order)) {
      const { ball, grips } = itemColors(item, summaryFallbacks);
      addItemToInv(inv, item, ball, grips);
    }
  }

  const gripTotal        = Array.from(inv.gripColors.values()).reduce((s, n) => s + n, 0);
  const sortedGripColors = Array.from(inv.gripColors.entries()).sort((a, b) => b[1] - a[1]);
  const sortedOther      = Array.from(inv.other.entries()).sort((a, b) => b[1] - a[1]);

  // Find orders contributing to unknown colors — items that should have a ball
  // color (kits, ball packs) but have neither customizations nor summary fallback.
  const unknownColorOrders: string[] = [];
  for (const order of orders) {
    const summaryFallbacks = parseSummaryColorsByName(order.order_summary);
    for (const item of getItems(order)) {
      const name = (item.product_name ?? item.slug ?? "").toLowerCase();
      const needsBall = (name.includes("kit") || name.includes("pack") || name.includes("anywhere"))
                        && !name.includes("grip") && !name.includes("bag") && !name.includes("crewneck");
      if (!needsBall) continue;
      const { ball } = itemColors(item, summaryFallbacks);
      if (!ball) {
        unknownColorOrders.push(`${order.customer_name ?? order.id} — ${item.product_name ?? "?"}`);
        break;
      }
    }
  }

  // Box counts
  let largeCt = 0, xlCt = 0, smallCt = 0, inputCt = 0;
  for (const order of orders) {
    const r = classifyBoxSize(getItems(order));
    if      (r.kind === "large") largeCt++;
    else if (r.kind === "xl")    xlCt++;
    else if (r.kind === "small") smallCt++;
    else                         inputCt++;
  }

  function handlePrint() {
    const date = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const invRows = [
      ...INV_ROWS
        .filter(r => inv[r.key] > 0)
        .map(r => `<tr><td class="qty">${inv[r.key]}×</td><td>${escHtml(r.label)}</td></tr>`),
      ...(gripTotal > 0 ? [
        `<tr><td class="qty">${gripTotal}×</td><td>Professional Over Grips</td></tr>`,
        ...sortedGripColors.map(([c, n]) =>
          `<tr><td class="qty sub">${n}×</td><td class="indent">${escHtml(c)}</td></tr>`
        ),
      ] : []),
      ...sortedOther.map(([name, qty]) =>
        `<tr><td class="qty">${qty}×</td><td>${escHtml(name)}</td></tr>`
      ),
    ].join("");

    const boxRows = [
      largeCt > 0 ? `<tr><td class="qty">${largeCt}×</td><td>Large box (24×12×6")</td></tr>` : "",
      xlCt    > 0 ? `<tr><td class="qty">${xlCt}×</td><td>XL box (48×13×8") — Anywhere Kit</td></tr>` : "",
      smallCt > 0 ? `<tr><td class="qty">${smallCt}×</td><td>Small box (10×4×4")</td></tr>` : "",
      inputCt > 0 ? `<tr class="warn"><td class="qty">${inputCt}×</td><td>⚠ Manual size needed</td></tr>` : "",
    ].join("");

    const orderList = orders.map(order => {
      const items            = getItems(order);
      const summaryFallbacks = parseSummaryColorsByName(order.order_summary);
      const boxResult        = classifyBoxSize(items);
      const boxLabel  =
        boxResult.kind === "xl"      ? "XL"
        : boxResult.kind === "large" ? "Large"
        : boxResult.kind === "small" ? "Small"
        : "⚠ Check";
      const badgeClass = boxResult.kind === "needs-input" ? "badge-warn" : "badge";
      const lines = items.map((item) => {
        const qty             = item.quantity ?? 1;
        const name            = item.product_name ?? item.slug ?? "?";
        const { ball, grips } = itemColors(item, summaryFallbacks);
        const suffix          = colorSuffix(ball, grips);
        return `<li>${qty}× ${escHtml(name)}${suffix ? `<span class="color-note">${escHtml(suffix)}</span>` : ""}</li>`;
      }).join("");
      return `
        <div class="order">
          <div class="order-header">
            <span class="cname">${escHtml(order.customer_name ?? "Unknown")}</span>
            <span class="${badgeClass}">${boxLabel}</span>
          </div>
          <ul>${lines}</ul>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fulfillment Cheat Sheet — ${date}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#111;padding:24px 28px}
  h1{font-size:18px;font-weight:700;margin-bottom:2px}
  .meta{color:#6b7280;font-size:12px;margin-bottom:22px}
  h2{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
  section{margin-bottom:22px}
  table{border-collapse:collapse;width:100%}
  td{padding:3px 6px 3px 0;vertical-align:top}
  td.qty{font-weight:700;min-width:36px;text-align:right;padding-right:10px}
  td.sub{font-weight:400;color:#6b7280}
  td.indent{color:#6b7280;padding-left:20px}
  tr.warn td{color:#d97706}
  .color-note{color:#6b7280;font-size:11px;margin-left:4px}
  .order{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e5e7eb}
  .order-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:5px}
  .cname{font-weight:600;font-size:14px}
  .badge{font-size:11px;color:#6b7280;background:#f3f4f6;border-radius:4px;padding:1px 7px}
  .badge-warn{font-size:11px;color:#b45309;background:#fef3c7;border-radius:4px;padding:1px 7px}
  ul{padding-left:18px}
  li{margin-bottom:3px}
  .print-btn{position:fixed;top:16px;right:16px;padding:8px 18px;background:#0284c7;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit}
  @media print{.print-btn{display:none}}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print</button>
<h1>Fulfillment Cheat Sheet</h1>
<p class="meta">${date} &nbsp;·&nbsp; ${orders.length} order${orders.length !== 1 ? "s" : ""}</p>
<section><h2>Items to Pack</h2><table>${invRows}</table></section>
<section><h2>Boxes Needed</h2><table>${boxRows}</table></section>
<section><h2>Order List</h2>${orderList}</section>
</body>
</html>`;

    const win = window.open("", "_blank", "width=740,height=960");
    if (!win) {
      alert("Please allow popups to open the printable cheat sheet.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Fulfillment Cheat Sheet</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {orders.length} order{orders.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable preview */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">

          {/* Unknown color warning */}
          {unknownColorOrders.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold mb-1">⚠ Missing ball color ({unknownColorOrders.length} item{unknownColorOrders.length !== 1 ? "s" : ""}) — counted as unknown:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {unknownColorOrders.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Items to Pack — fixed inventory order */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Items to Pack
            </h3>
            <table className="w-full">
              <tbody>
                {INV_ROWS.filter(r => inv[r.key] > 0).map(r => (
                  <tr key={r.key}>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{inv[r.key]}×</td>
                    <td className="text-gray-700 py-0.5">{r.label}</td>
                  </tr>
                ))}
                {gripTotal > 0 && (
                  <>
                    <tr>
                      <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{gripTotal}×</td>
                      <td className="text-gray-700 py-0.5">Professional Over Grips</td>
                    </tr>
                    {sortedGripColors.map(([color, count]) => (
                      <tr key={color}>
                        <td className="text-gray-400 w-10 text-right pr-3 py-0.5 text-xs">{count}×</td>
                        <td className="text-gray-400 py-0.5 text-xs pl-4">{color}</td>
                      </tr>
                    ))}
                  </>
                )}
                {sortedOther.map(([name, qty]) => (
                  <tr key={name}>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{qty}×</td>
                    <td className="text-gray-700 py-0.5">{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Boxes needed */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Boxes Needed
            </h3>
            <table className="w-full">
              <tbody>
                {largeCt > 0 && (
                  <tr>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{largeCt}×</td>
                    <td className="text-gray-700 py-0.5">Large box (24×12×6&quot;)</td>
                  </tr>
                )}
                {xlCt > 0 && (
                  <tr>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{xlCt}×</td>
                    <td className="text-gray-700 py-0.5">XL box (48×13×8&quot;) — Anywhere Kit</td>
                  </tr>
                )}
                {smallCt > 0 && (
                  <tr>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{smallCt}×</td>
                    <td className="text-gray-700 py-0.5">Small box (10×4×4&quot;)</td>
                  </tr>
                )}
                {inputCt > 0 && (
                  <tr>
                    <td className="font-bold text-amber-600 w-10 text-right pr-3 py-0.5">{inputCt}×</td>
                    <td className="text-amber-600 py-0.5">Manual size needed</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Order list */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Order List
            </h3>
            <div className="space-y-3">
              {orders.map(order => {
                const items            = getItems(order);
                const summaryFallbacks = parseSummaryColorsByName(order.order_summary);
                const boxResult        = classifyBoxSize(items);
                const boxLabel  =
                  boxResult.kind === "xl"      ? "XL"
                  : boxResult.kind === "large" ? "Large"
                  : boxResult.kind === "small" ? "Small"
                  : "⚠ Check";
                const badgeColor =
                  boxResult.kind === "needs-input"
                    ? "text-amber-700 bg-amber-50"
                    : "text-gray-500 bg-gray-100";
                return (
                  <div key={order.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{order.customer_name ?? "Unknown"}</span>
                      <span className={`text-xs rounded px-1.5 py-0.5 ${badgeColor}`}>{boxLabel}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-600">
                      {items.map((item, i) => {
                        const qty             = item.quantity ?? 1;
                        const name            = item.product_name ?? item.slug ?? "?";
                        const { ball, grips } = itemColors(item, summaryFallbacks);
                        return (
                          <li key={i}>
                            {qty}× {name}
                            {ball  && <ColorTag label={`ball: ${ball}`} />}
                            {grips?.map((c, gi) => <ColorTag key={gi} label={`grip: ${c}`} />)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg
                       hover:bg-sky-700 transition-colors"
          >
            Open Printable View
          </button>
        </div>
      </div>
    </div>
  );
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
