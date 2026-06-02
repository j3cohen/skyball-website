"use client";

import { classifyBoxSize } from "@/lib/box-size";
import type { ExportableOrder, OrderData, OrderDataItem } from "@/lib/order-types";

type Props = {
  orders: ExportableOrder[];
  onClose: () => void;
};

function getItems(order: ExportableOrder): OrderDataItem[] {
  return ((order.order_data as OrderData | null)?.items) ?? [];
}


function CustomBadges({ customizations }: { customizations?: Record<string, unknown> }) {
  if (!customizations) return null;
  const grips = customizations.grip_colors as string[] | undefined;
  const ball  = customizations.ball_color  as string  | undefined;
  if (!grips?.length && !ball) return null;
  return (
    <span className="ml-1.5 inline-flex flex-wrap gap-1">
      {grips?.map((c, i) => (
        <span key={i} className="rounded bg-purple-100 text-purple-800 px-1.5 py-0.5 text-[10px] font-medium leading-none">
          grip: {c}
        </span>
      ))}
      {ball && (
        <span className="rounded bg-sky-100 text-sky-800 px-1.5 py-0.5 text-[10px] font-medium leading-none">
          ball: {ball}
        </span>
      )}
    </span>
  );
}

export default function FulfillmentCheatSheetModal({ orders, onClose }: Props) {
  // Aggregate item totals
  const itemTotals = new Map<string, number>();
  for (const order of orders) {
    for (const item of getItems(order)) {
      const name = item.product_name ?? item.slug ?? "Unknown";
      const qty = item.quantity ?? 1;
      itemTotals.set(name, (itemTotals.get(name) ?? 0) + qty);
    }
  }
  const sortedItems = Array.from(itemTotals.entries()).sort((a, b) => b[1] - a[1]);

  // Box counts
  let largeCt = 0, smallCt = 0, inputCt = 0;
  for (const order of orders) {
    const r = classifyBoxSize(getItems(order));
    if (r.kind === "large") largeCt++;
    else if (r.kind === "small") smallCt++;
    else inputCt++;
  }

  function handlePrint() {
    const date = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const itemRows = sortedItems
      .map(([name, qty]) => `<tr><td class="qty">${qty}×</td><td>${escHtml(name)}</td></tr>`)
      .join("");

    const boxRows = [
      largeCt > 0 ? `<tr><td class="qty">${largeCt}×</td><td>Large box (24×12×6")</td></tr>` : "",
      smallCt > 0 ? `<tr><td class="qty">${smallCt}×</td><td>Small box (10×4×4")</td></tr>` : "",
      inputCt > 0 ? `<tr class="warn"><td class="qty">${inputCt}×</td><td>⚠ Manual size needed</td></tr>` : "",
    ].join("");

    const orderList = orders.map(order => {
      const items = getItems(order);
      const boxResult = classifyBoxSize(items);
      const boxLabel =
        boxResult.kind === "large" ? "Large"
        : boxResult.kind === "small" ? "Small"
        : "⚠ Check";
      const badgeClass = boxResult.kind === "needs-input" ? "badge-warn" : "badge";
      const lines = items.map(item => {
        const qty = item.quantity ?? 1;
        const name = item.product_name ?? item.slug ?? "?";
        const grips = item.customizations?.grip_colors as string[] | undefined;
        const ball  = item.customizations?.ball_color  as string  | undefined;
        const colorBadges = [
          ...(grips ?? []).map(c => `<span class="cbadge grip">grip: ${escHtml(c)}</span>`),
          ...(ball ? [`<span class="cbadge ball">ball: ${escHtml(ball)}</span>`] : []),
        ].join("");
        return `<li>${qty}× ${escHtml(name)}${colorBadges ? ` ${colorBadges}` : ""}</li>`;
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
  table{border-collapse:collapse}
  td{padding:2px 6px 2px 0;vertical-align:top}
  td.qty{font-weight:700;min-width:32px;text-align:right;padding-right:10px}
  tr.warn td{color:#d97706}
  .order{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e5e7eb}
  .order-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:5px}
  .cname{font-weight:600;font-size:14px}
  .badge{font-size:11px;color:#6b7280;background:#f3f4f6;border-radius:4px;padding:1px 7px}
  .badge-warn{font-size:11px;color:#b45309;background:#fef3c7;border-radius:4px;padding:1px 7px}
  ul{padding-left:18px}
  li{margin-bottom:4px;display:flex;align-items:baseline;flex-wrap:wrap;gap:3px}
  .cbadge{font-size:10px;font-weight:600;border-radius:3px;padding:1px 5px;white-space:nowrap}
  .cbadge.grip{background:#ede9fe;color:#6d28d9}
  .cbadge.ball{background:#e0f2fe;color:#0369a1}
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
                {sortedItems.map(([name, qty]) => (
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
                const items = getItems(order);
                const boxResult = classifyBoxSize(items);
                const boxLabel =
                  boxResult.kind === "large" ? "Large"
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
                        const qty = item.quantity ?? 1;
                        const name = item.product_name ?? item.slug ?? "?";
                        return (
                          <li key={i} className="flex items-start flex-wrap gap-y-0.5">
                            <span>{qty}× {name}</span>
                            <CustomBadges customizations={item.customizations} />
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
