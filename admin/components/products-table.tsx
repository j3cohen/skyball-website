"use client";

// Products list: every shop product with its first image, visibility and
// whether it has an active price (the site hides products without one).
// "New product" creates an inactive, image-less row and opens its editor.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PRODUCT_KINDS,
  normalizeSlug,
  type AdminProductRow,
  type ProductKind,
} from "@/lib/product-admin";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

const KIND_BADGE: Record<ProductKind, string> = {
  base: "bg-sky-100 text-sky-800",
  addon: "bg-violet-100 text-violet-800",
  bundle: "bg-emerald-100 text-emerald-800",
};

export default function ProductsTable() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProductRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [newKind, setNewKind] = useState<ProductKind>("base");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/products");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load products.");
      setProducts(json.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products.");
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProduct() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim() || undefined,
          kind: newKind,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create product.");
      router.push(`/products/${json.product.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create product.");
      setCreating(false);
    }
  }

  const visible = (products ?? []).filter((p) => showInactive || p.active);

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Shop catalog on skyball.us — photos, copy and visibility. Prices live in Stripe.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
        >
          {showCreate ? "Cancel" : "New product"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">New product</h2>
          <p className="text-xs text-gray-500 mb-4">
            Created hidden (inactive) with no images. It won&apos;t appear on the shop until it is
            active <em>and</em> has an active price row in <span className="font-mono">product_prices</span>.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!slugTouched) setNewSlug(normalizeSlug(e.target.value));
                }}
                className={inputCls}
                placeholder="SkyBall Racket Pro"
                autoFocus
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-gray-400 font-normal">(/products/…)</span>
              </label>
              <input
                value={newSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setNewSlug(e.target.value);
                }}
                onBlur={() => setNewSlug(normalizeSlug(newSlug))}
                className={`${inputCls} font-mono`}
                placeholder="skyball-racket-pro"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kind</label>
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as ProductKind)}
                className={inputCls}
              >
                {PRODUCT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={createProduct}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating…" : "Create and edit"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="mb-3 flex items-center justify-between text-sm text-gray-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
        {products && (
          <span>
            {visible.length} of {products.length}
          </span>
        )}
      </div>

      {products === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">No products.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {visible.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/products/${p.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                    {p.first_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.first_image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                        no image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{p.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_BADGE[p.kind]}`}>
                        {p.kind}
                      </span>
                      {!p.active && (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                          inactive
                        </span>
                      )}
                      {p.active && !p.has_active_price && (
                        <span
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                          title="The shop only lists products with an active price row"
                        >
                          no active price · hidden on site
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 font-mono truncate">
                      /products/{p.slug}
                      <span className="font-sans"> · {p.image_count} image{p.image_count === 1 ? "" : "s"} · sort {p.sort_order}</span>
                    </p>
                  </div>
                  <span className="hidden sm:block text-xs text-gray-400">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
