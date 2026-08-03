"use client";

import { classifyBoxSize } from "@/lib/box-size";
import { resolveBom, BALL_PACK_SIZES, type BallPackSize } from "@/lib/product-bom";
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

const BOX_LABELS: Record<string, string> = {
  xl:           "XL",
  large:        "Large",
  essentials:   "Essentials",
  ball:         "Ball",
  small:        "Small",
  "needs-input": "⚠ Check",
};

function boxLabelFor(kind: string): string {
  return BOX_LABELS[kind] ?? "⚠ Check";
}

function ColorTag({ label }: { label: string }) {
  return (
    <span className="ml-1 rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px] font-medium leading-none">
      {label}
    </span>
  );
}

// ── Inventory bucket ───────────────────────────────────────────────────────
//
// Quantities come from the shared BOM (`lib/product-bom.ts`); the colour split
// is layered on here from each line's customizations.

type Inv = {
  racketPro:      number;
  racketStarter:  number;
  racketOriginal: number;
  nets:           number;
  covers:         number;
  crewnecks:      number;
  packs:          Map<string, number>; // "3|blue" → pack count
  looseBalls:     number;              // balls with no pack provenance
  gripColors:     Map<string, number>; // color → individual grip count
  other:          Map<string, number>; // couldn't decompose → pack by hand
};

function makeInv(): Inv {
  return {
    racketPro: 0, racketStarter: 0, racketOriginal: 0,
    nets: 0, covers: 0, crewnecks: 0,
    packs: new Map(),
    looseBalls: 0,
    gripColors: new Map(),
    other: new Map(),
  };
}

const UNKNOWN_COLOR = "unknown color";

function addPack(inv: Inv, size: BallPackSize, color: string | undefined, n: number) {
  const c = (color ?? "").toLowerCase();
  const key = `${size}|${c === "blue" || c === "orange" ? c : UNKNOWN_COLOR}`;
  inv.packs.set(key, (inv.packs.get(key) ?? 0) + n);
}

function addItemToInv(inv: Inv, item: OrderDataItem, ball: string | undefined, grips: string[] | undefined) {
  const displayName = item.product_name ?? item.slug ?? "Unknown";
  const qty         = item.quantity ?? 1;
  const { bom, source } = resolveBom(item);

  if (source === "non_goods") return;
  if (source === "unmapped") {
    inv.other.set(displayName, (inv.other.get(displayName) ?? 0) + qty);
    return;
  }

  inv.racketPro      += (bom.components.racket_pro      ?? 0) * qty;
  inv.racketStarter  += (bom.components.racket_starter  ?? 0) * qty;
  inv.racketOriginal += (bom.components.racket_original ?? 0) * qty;
  inv.nets           += (bom.components.net             ?? 0) * qty;
  inv.covers         += (bom.components.racket_cover    ?? 0) * qty;
  inv.crewnecks      += (bom.components.crewneck        ?? 0) * qty;

  // Balls: prefer pack provenance so the picker knows which tubes to grab.
  // Custom orders parsed from free text only give a raw ball count.
  const packs = bom.ballPacks ?? {};
  let packedBalls = 0;
  for (const size of BALL_PACK_SIZES) {
    const n = packs[size] ?? 0;
    if (n > 0) {
      addPack(inv, size, ball, n * qty);
      packedBalls += size * n * qty;
    }
  }
  inv.looseBalls += Math.max(0, (bom.components.ball ?? 0) * qty - packedBalls);

  // Grips: assign the colors the customer picked, and park any remainder under
  // "?" so the color rows always sum to the real grip count.
  const gripCount = (bom.components.grip ?? 0) * qty;
  if (gripCount > 0) {
    const chosen = (grips ?? []).slice(0, gripCount);
    for (const c of chosen) inv.gripColors.set(c, (inv.gripColors.get(c) ?? 0) + 1);
    const rest = gripCount - chosen.length;
    if (rest > 0) inv.gripColors.set("?", (inv.gripColors.get("?") ?? 0) + rest);
  }
}

// Fixed display order for the inventory rows: rackets, nets, ball packs
// (smallest first, blue before orange), then accessories.
function buildInvRows(inv: Inv): { label: string; qty: number }[] {
  const rows: { label: string; qty: number }[] = [
    { label: "Pro Rackets",       qty: inv.racketPro      },
    { label: "Starter Rackets",   qty: inv.racketStarter  },
    { label: "Rackets (Original)",qty: inv.racketOriginal },
    { label: "Nets",              qty: inv.nets           },
  ];

  for (const size of BALL_PACK_SIZES) {
    for (const color of ["blue", "orange", UNKNOWN_COLOR]) {
      const qty = inv.packs.get(`${size}|${color}`) ?? 0;
      const suffix = color === UNKNOWN_COLOR ? `(${UNKNOWN_COLOR})` : color[0].toUpperCase() + color.slice(1);
      rows.push({ label: `${size}-Packs ${suffix}`, qty });
    }
  }

  rows.push(
    { label: "Loose Balls",   qty: inv.looseBalls },
    { label: "Racket Covers", qty: inv.covers     },
    { label: "Crewnecks",     qty: inv.crewnecks  },
  );

  return rows.filter((r) => r.qty > 0);
}

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

  const invRowsData      = buildInvRows(inv);
  const gripTotal        = Array.from(inv.gripColors.values()).reduce((s, n) => s + n, 0);
  const sortedGripColors = Array.from(inv.gripColors.entries()).sort((a, b) => b[1] - a[1]);
  const sortedOther      = Array.from(inv.other.entries()).sort((a, b) => b[1] - a[1]);

  // Find orders contributing to unknown colors — any line that ships ball packs
  // but has neither customizations nor a summary fallback.
  const unknownColorOrders: string[] = [];
  for (const order of orders) {
    const summaryFallbacks = parseSummaryColorsByName(order.order_summary);
    for (const item of getItems(order)) {
      const { bom } = resolveBom(item);
      const shipsPacks = BALL_PACK_SIZES.some((s) => (bom.ballPacks?.[s] ?? 0) > 0);
      if (!shipsPacks) continue;
      const { ball } = itemColors(item, summaryFallbacks);
      if (!ball) {
        unknownColorOrders.push(`${order.customer_name ?? order.id} — ${item.product_name ?? "?"}`);
        break;
      }
    }
  }

  // Box counts
  let largeCt = 0, xlCt = 0, essentialsCt = 0, ballCt = 0, smallCt = 0, inputCt = 0;
  for (const order of orders) {
    const r = classifyBoxSize(getItems(order));
    if      (r.kind === "large")      largeCt++;
    else if (r.kind === "xl")         xlCt++;
    else if (r.kind === "essentials") essentialsCt++;
    else if (r.kind === "ball")       ballCt++;
    else if (r.kind === "small")      smallCt++;
    else                              inputCt++;
  }

  function handlePrint() {
    const date = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const invRows = [
      ...invRowsData
        .map(r => `<tr><td class="qty">${r.qty}×</td><td>${escHtml(r.label)}</td></tr>`),
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
      largeCt      > 0 ? `<tr><td class="qty">${largeCt}×</td><td>Large box (24×12×6")</td></tr>` : "",
      xlCt         > 0 ? `<tr><td class="qty">${xlCt}×</td><td>XL box (48×13×8") — Anywhere Kit</td></tr>` : "",
      essentialsCt > 0 ? `<tr><td class="qty">${essentialsCt}×</td><td>Essentials box (24×12×4")</td></tr>` : "",
      ballCt       > 0 ? `<tr><td class="qty">${ballCt}×</td><td>Ball box (10×8×8")</td></tr>` : "",
      smallCt      > 0 ? `<tr><td class="qty">${smallCt}×</td><td>Small box (10×4×4")</td></tr>` : "",
      inputCt      > 0 ? `<tr class="warn"><td class="qty">${inputCt}×</td><td>⚠ Manual size needed</td></tr>` : "",
    ].join("");

    const orderList = orders.map(order => {
      const items            = getItems(order);
      const summaryFallbacks = parseSummaryColorsByName(order.order_summary);
      const boxResult        = classifyBoxSize(items);
      const boxLabel         = boxLabelFor(boxResult.kind);
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
                {invRowsData.map(r => (
                  <tr key={r.label}>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{r.qty}×</td>
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
                {essentialsCt > 0 && (
                  <tr>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{essentialsCt}×</td>
                    <td className="text-gray-700 py-0.5">Essentials box (24×12×4&quot;)</td>
                  </tr>
                )}
                {ballCt > 0 && (
                  <tr>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5">{ballCt}×</td>
                    <td className="text-gray-700 py-0.5">Ball box (10×8×8&quot;)</td>
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
                const boxLabel         = boxLabelFor(boxResult.kind);
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
