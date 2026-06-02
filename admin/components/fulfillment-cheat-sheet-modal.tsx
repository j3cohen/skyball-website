"use client";

import { classifyBoxSize } from "@/lib/box-size";
import type { ExportableOrder, OrderData, OrderDataItem } from "@/lib/order-types";

type Props = {
  orders: ExportableOrder[];
  onClose: () => void;
};

type AggregatedItem = {
  name: string;
  qty: number;
  ballColor?: string;
  gripColors?: string[];
};

function getItems(order: ExportableOrder): OrderDataItem[] {
  return ((order.order_data as OrderData | null)?.items) ?? [];
}

// Parse per-item color data from order_summary when customizations are empty.
// Summary format: "1x Name ($price) [ball:orange] | 1x Name ($price) [grips:r,r] | Total:..."
type SummaryColors = { ballColor?: string; gripColors?: string[] };
function parseSummaryColors(summary: string | null): SummaryColors[] {
  if (!summary) return [];
  return summary
    .split(" | ")
    .filter(p => !p.startsWith("Total:"))
    .map(p => {
      const out: SummaryColors = {};
      const ball  = p.match(/\[ball:([^\]]+)\]/);
      if (ball)  out.ballColor  = ball[1].trim();
      const grip = p.match(/\[grips:([^\]]+)\]/);
      if (grip)  out.gripColors = grip[1].split(",").map(s => s.trim());
      return out;
    });
}

function itemColors(item: OrderDataItem, fallback: SummaryColors): { ball?: string; grips?: string[] } {
  return {
    ball:  (item.customizations?.ball_color  as string   | undefined) ?? fallback.ballColor,
    grips: (item.customizations?.grip_colors as string[] | undefined) ?? fallback.gripColors,
  };
}

function colorSuffix(ballColor?: string, gripColors?: string[]): string {
  const parts: string[] = [];
  if (gripColors?.length) parts.push(`grip: ${gripColors.join(", ")}`);
  if (ballColor)          parts.push(`ball: ${ballColor}`);
  return parts.length ? ` — ${parts.join(" · ")}` : "";
}

function ColorTags({ ballColor }: { ballColor?: string }) {
  if (!ballColor) return null;
  return (
    <span className="ml-1.5 inline-flex flex-wrap gap-1">
      <span className="rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px] font-medium leading-none">
        ball: {ballColor}
      </span>
    </span>
  );
}

export default function FulfillmentCheatSheetModal({ orders, onClose }: Props) {
  // Aggregate items. Grips are handled separately: each entry in grip_colors[]
  // is one individual grip, so we count them by color across all orders/packs.
  const itemMap       = new Map<string, AggregatedItem>();
  const gripColorMap  = new Map<string, number>(); // color → individual grip count

  for (const order of orders) {
    const summaryFallbacks = parseSummaryColors(order.order_summary);
    for (const [i, item] of getItems(order).entries()) {
      const name            = item.product_name ?? item.slug ?? "Unknown";
      const qty             = item.quantity ?? 1;
      const { ball, grips } = itemColors(item, summaryFallbacks[i] ?? {});
      const isGrip          = grips !== undefined || name.toLowerCase().includes("grip");

      if (isGrip) {
        // Each entry in grips[] = 1 individual grip (already accounts for qty × packSize)
        const colors = grips ?? [];
        if (colors.length > 0) {
          for (const color of colors) {
            gripColorMap.set(color, (gripColorMap.get(color) ?? 0) + 1);
          }
        } else {
          gripColorMap.set("?", (gripColorMap.get("?") ?? 0) + qty);
        }
      } else {
        const colorKey = [ball ?? "", ""].join("|");
        const key      = `${name}||${colorKey}`;
        const existing = itemMap.get(key);
        if (existing) {
          existing.qty += qty;
        } else {
          itemMap.set(key, { name, qty, ballColor: ball, gripColors: undefined });
        }
      }
    }
  }

  const sortedItems      = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);
  const gripTotal        = Array.from(gripColorMap.values()).reduce((s, n) => s + n, 0);
  const sortedGripColors = Array.from(gripColorMap.entries()).sort((a, b) => b[1] - a[1]);

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

    const gripRows = gripTotal > 0
      ? [
          `<tr><td class="qty">${gripTotal}×</td><td>Professional Over Grips</td></tr>`,
          ...sortedGripColors.map(([color, count]) =>
            `<tr class="sub"><td class="qty sub">${count}×</td><td class="indent">${escHtml(color)}</td></tr>`
          ),
        ].join("")
      : "";

    const itemRows = [
      ...sortedItems.map(({ name, qty, ballColor }) => {
        const suffix = colorSuffix(ballColor, undefined);
        return `<tr><td class="qty">${qty}×</td><td>${escHtml(name)}${suffix ? `<span class="color-note">${escHtml(suffix)}</span>` : ""}</td></tr>`;
      }),
      gripRows,
    ].join("");

    const boxRows = [
      largeCt > 0 ? `<tr><td class="qty">${largeCt}×</td><td>Large box (24×12×6")</td></tr>` : "",
      xlCt    > 0 ? `<tr><td class="qty">${xlCt}×</td><td>XL box (48×13×8") — Anywhere Kit</td></tr>` : "",
      smallCt > 0 ? `<tr><td class="qty">${smallCt}×</td><td>Small box (10×4×4")</td></tr>` : "",
      inputCt > 0 ? `<tr class="warn"><td class="qty">${inputCt}×</td><td>⚠ Manual size needed</td></tr>` : "",
    ].join("");

    const orderList = orders.map(order => {
      const items            = getItems(order);
      const summaryFallbacks = parseSummaryColors(order.order_summary);
      const boxResult        = classifyBoxSize(items);
      const boxLabel  =
        boxResult.kind === "xl"    ? "XL"
        : boxResult.kind === "large" ? "Large"
        : boxResult.kind === "small" ? "Small"
        : "⚠ Check";
      const badgeClass = boxResult.kind === "needs-input" ? "badge-warn" : "badge";
      const lines = items.map((item, i) => {
        const qty              = item.quantity ?? 1;
        const name             = item.product_name ?? item.slug ?? "?";
        const { ball, grips }  = itemColors(item, summaryFallbacks[i] ?? {});
        const suffix           = colorSuffix(ball, grips);
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
  td.sub{font-weight:400;color:#6b7280;padding-right:10px}
  td.indent{color:#6b7280;padding-left:16px}
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
<section><h2>Items to Pack</h2><table>${itemRows}</table></section>
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

          {/* Items to pack */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Items to Pack
            </h3>
            <table className="w-full">
              <tbody>
                {sortedItems.map(({ name, qty, ballColor }, i) => (
                  <tr key={i}>
                    <td className="font-bold text-gray-900 w-10 text-right pr-3 py-0.5 align-top">{qty}×</td>
                    <td className="text-gray-700 py-0.5">
                      {name}
                      <ColorTags ballColor={ballColor} />
                    </td>
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
                        <td className="text-gray-500 w-10 text-right pr-3 py-0.5 text-xs pl-4">{count}×</td>
                        <td className="text-gray-500 py-0.5 text-xs pl-3">{color}</td>
                      </tr>
                    ))}
                  </>
                )}
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
                const summaryFallbacks = parseSummaryColors(order.order_summary);
                const boxResult        = classifyBoxSize(items);
                const boxLabel  =
                  boxResult.kind === "xl"    ? "XL"
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
                        const qty              = item.quantity ?? 1;
                        const name             = item.product_name ?? item.slug ?? "?";
                        const { ball, grips }  = itemColors(item, summaryFallbacks[i] ?? {});
                        return (
                          <li key={i}>
                            {qty}× {name}
                            <ColorTags ballColor={ball} />
                            {grips?.map((c, gi) => (
                              <span key={gi} className="ml-1 rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                                grip: {c}
                              </span>
                            ))}
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
