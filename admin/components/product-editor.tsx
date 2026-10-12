"use client";

// Product editor: images card (ordered URL list with previews), details card
// (name, slug, kind, sku, sort order, active, description, details, features),
// and a read-only price card. Mirrors cert-program-editor.tsx conventions.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ImageListEditor from "@/components/image-list-editor";
import {
  PRODUCT_KINDS,
  S3_BUCKET_HOST,
  S3_SHOP_PREFIX,
  cleanImageList,
  formatPrice,
  normalizeSlug,
  toImageList,
  type AdminPrice,
  type AdminProduct,
  type ProductKind,
} from "@/lib/product-admin";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

const SITE_ORIGIN = "https://skyball.us";

export default function ProductEditor({ productId }: { productId: string }) {
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [prices, setPrices] = useState<AdminPrice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Images card
  const [images, setImages] = useState<string[]>([]);
  const [savingImages, setSavingImages] = useState(false);

  // Details card
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState<ProductKind>("base");
  const [sku, setSku] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(false);
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState("");
  const [features, setFeatures] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  const applyProduct = useCallback((p: AdminProduct) => {
    setProduct(p);
    setImages(toImageList(p.images));
    setName(p.name);
    setSlug(p.slug);
    setKind(p.kind);
    setSku(p.sku === null ? "" : String(p.sku));
    setSortOrder(String(p.sort_order));
    setActive(p.active);
    setDescription(p.description ?? "");
    setDetails(p.details ?? "");
    // Legacy rows can hold NULL despite the '{}' default.
    setFeatures((p.features ?? []).join("\n"));
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load product.");
      applyProduct(json.product);
      setPrices(json.prices ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load product.");
    }
  }, [productId, applyProduct]);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  }

  async function patch(body: Record<string, unknown>): Promise<AdminProduct> {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to save.");
    return json.product as AdminProduct;
  }

  async function saveImages() {
    setSavingImages(true);
    setError(null);
    try {
      const p = await patch({ images: cleanImageList(images) });
      applyProduct(p);
      flash("Images saved — live on the shop now.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save images.");
    } finally {
      setSavingImages(false);
    }
  }

  async function saveDetails() {
    if (!product) return;
    const nextSlug = normalizeSlug(slug);
    if (
      nextSlug !== product.slug &&
      !window.confirm(
        `Change the URL from /products/${product.slug} to /products/${nextSlug}?\n\n` +
          "Existing links, QR codes and search results pointing at the old URL will break.",
      )
    ) {
      return;
    }
    setSavingDetails(true);
    setError(null);
    try {
      const skuTrim = sku.trim();
      const p = await patch({
        name: name.trim(),
        slug: nextSlug,
        kind,
        sku: skuTrim === "" ? null : Number(skuTrim),
        sort_order: Number.parseInt(sortOrder, 10) || 0,
        active,
        description,
        details,
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
      });
      applyProduct(p);
      flash("Details saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save details.");
    } finally {
      setSavingDetails(false);
    }
  }

  if (!product) {
    return (
      <div className="p-4 md:p-8 max-w-4xl">
        <Link href="/products" className="text-sm text-sky-700 hover:text-sky-900">
          ← All products
        </Link>
        {error ? (
          <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        )}
      </div>
    );
  }

  const hasActivePrice = prices.some((p) => p.active);
  const imagesDirty = JSON.stringify(cleanImageList(images)) !== JSON.stringify(toImageList(product.images));

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/products" className="text-sm text-sky-700 hover:text-sky-900">
          ← All products
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                product.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
              }`}
            >
              {product.active ? "active" : "inactive"}
            </span>
            <a
              href={`${SITE_ORIGIN}/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View on site ↗
            </a>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          <span className="font-mono">/products/{product.slug}</span> · {product.kind}
        </p>
      </div>

      {notice && (
        <p className="mb-4 text-sm text-green-800 bg-green-50 rounded-lg px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {product.active && !hasActivePrice && (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          This product has no active price row, so the shop does not list it. Add one in{" "}
          <span className="font-mono">product_prices</span> (with its Stripe price ID) to make it visible.
        </p>
      )}

      {/* Images */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Images</h2>
        <p className="text-xs text-gray-500 mb-4">
          Upload the file to S3 (<span className="font-mono">{S3_BUCKET_HOST}/{S3_SHOP_PREFIX}…</span>,
          public-read) first, then paste its URL here. Image 1 is the shop tile; when there is more than
          one image the product page gallery shows images 2 onward. Drag the handle or use the arrows to reorder.
        </p>
        <ImageListEditor id="product-images" value={images} onChange={setImages} disabled={savingImages} />
        <div className="mt-4 flex items-center justify-end gap-3">
          {imagesDirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
          <button
            onClick={saveImages}
            disabled={savingImages || !imagesDirty}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {savingImages ? "Saving…" : "Save images"}
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-gray-400 font-normal">(/products/…)</span>
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setSlug(normalizeSlug(slug))}
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kind</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ProductKind)}
              className={inputCls}
            >
              {PRODUCT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU <span className="text-gray-400 font-normal">(number, optional)</span>
            </label>
            <input
              value={sku}
              inputMode="numeric"
              onChange={(e) => setSku(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort order <span className="text-gray-400 font-normal">(lower = earlier)</span>
            </label>
            <input
              value={sortOrder}
              inputMode="numeric"
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active (listed on the shop when it also has an active price)
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(shop tile + top of product page)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Details <span className="text-gray-400 font-normal">(long copy on the product page)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={6}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Features <span className="text-gray-400 font-normal">(one per line)</span>
            </label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={5}
              className={`${inputCls} font-mono text-xs`}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveDetails}
            disabled={savingDetails || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {savingDetails ? "Saving…" : "Save details"}
          </button>
        </div>
      </div>

      {/* Prices (read-only) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-1">Price</h2>
        <p className="text-xs text-gray-500 mb-4">
          Read-only. Prices are Stripe price rows in <span className="font-mono">product_prices</span>;
          the shop uses the single active one.
        </p>
        {prices.length === 0 ? (
          <p className="text-sm text-gray-500">No price rows.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {prices.map((pr) => (
              <li key={pr.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="font-medium text-gray-900">{formatPrice(pr.unit_amount, pr.currency)}</span>
                {pr.label && <span className="text-gray-600">{pr.label}</span>}
                <span className="font-mono text-xs text-gray-400 truncate">{pr.stripe_price_id ?? "—"}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                    pr.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {pr.active ? "active" : "inactive"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
