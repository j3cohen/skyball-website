"use client";

// Create/edit modal for a certification offer (a purchasable pack):
// name, price, seat count, and free-text equipment lines with
// product-name autocomplete suggestions (datalist).

import { useEffect, useState } from "react";
import {
  centsToDollarInput,
  dollarInputToCents,
  type CertEquipmentItem,
  type CertOffer,
} from "@/lib/cert-utils";

type Props = {
  programId: string;
  offer: CertOffer | null; // null = create
  onClose: () => void;
  onSaved: () => void;
};

export default function CertOfferModal({ programId, offer, onClose, onSaved }: Props) {
  const [name, setName] = useState(offer?.name ?? "");
  const [description, setDescription] = useState(offer?.description ?? "");
  const [price, setPrice] = useState(centsToDollarInput(offer?.price_cents));
  const [seatCount, setSeatCount] = useState(String(offer?.seat_count ?? 1));
  const [items, setItems] = useState<CertEquipmentItem[]>(offer?.equipment_items ?? []);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/certification/product-names")
      .then((r) => r.json())
      .then((j) => setProductNames(j.names ?? []))
      .catch(() => {});
  }, []);

  async function save() {
    const priceCents = dollarInputToCents(price);
    const seats = Number.parseInt(seatCount, 10);
    if (!name.trim()) return setError("Name is required.");
    if (priceCents === null) return setError("Enter a valid price.");
    if (!Number.isInteger(seats) || seats < 1) return setError("Seats must be at least 1.");
    const cleanItems = items
      .map((i) => ({ label: i.label.trim(), qty: i.qty }))
      .filter((i) => i.label);
    if (cleanItems.some((i) => !Number.isInteger(i.qty) || i.qty < 1)) {
      return setError("Every equipment line needs a quantity of at least 1.");
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        program_id: programId,
        name: name.trim(),
        description: description.trim() || null,
        price_cents: priceCents,
        seat_count: seats,
        equipment_items: cleanItems,
      };
      const res = await fetch(
        offer
          ? `/api/admin/certification/offers/${offer.id}`
          : "/api/admin/certification/offers",
        {
          method: offer ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save offer.");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save offer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {offer ? "Edit offer" : "New offer"}
        </h2>

        <div className="space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Club 3-Pack"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (USD)">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="99.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </Field>
            <Field label="Certification seats">
              <input
                value={seatCount}
                onChange={(e) => setSeatCount(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Equipment included (combo packs)
              </label>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, { label: "", qty: 1 }])}
                className="text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                + Add line
              </button>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Leave empty for certification-only offers. Combo packs collect a shipping
              address at checkout and create a fulfillment order.
            </p>
            <datalist id="cert-product-names">
              {productNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <div className="mt-2 space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item.label}
                    list="cert-product-names"
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, j) => (j === i ? { ...it, label: e.target.value } : it))
                      )
                    }
                    placeholder="SkyBall Racket"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <input
                    value={String(item.qty)}
                    inputMode="numeric"
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, j) =>
                          j === i
                            ? { ...it, qty: Number.parseInt(e.target.value, 10) || 0 }
                            : it
                        )
                      )
                    }
                    className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Remove line"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : offer ? "Save changes" : "Create offer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
