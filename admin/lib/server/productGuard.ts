// lib/server/productGuard.ts
// Field validators for /api/admin/products/* routes. Auth + rate limit come
// from guardCertAdmin() in certGuard.ts — that guard is generic (admin
// session + per-user limiter) despite its name; reusing it keeps one limiter.

import { NextResponse } from "next/server";
import { PRODUCT_KINDS, type ProductKind, normalizeSlug, parseHttpsUrl } from "@/lib/product-admin";

export const MAX_IMAGES = 50;
export const MAX_IMAGE_URL_LEN = 2000;
export const MAX_FEATURES = 50;
export const MAX_FEATURE_LEN = 500;

export function productKind(v: unknown): ProductKind | null {
  return (PRODUCT_KINDS as readonly unknown[]).includes(v) ? (v as ProductKind) : null;
}

/** Normalized slug, or null when nothing survives normalization. */
export function slugField(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = normalizeSlug(v);
  return s.length > 0 ? s : null;
}

/**
 * Validate the images array: ≤ MAX_IMAGES https URLs, each trimmed and
 * ≤ MAX_IMAGE_URL_LEN chars. Returns the clean list or an error message
 * naming the offending index (1-based, matching the editor's row numbers).
 */
export function imageUrlList(v: unknown): { images: string[]; error?: never } | { error: string; images?: never } {
  if (!Array.isArray(v)) return { error: "images must be an array of URLs." };
  if (v.length > MAX_IMAGES) return { error: `images: at most ${MAX_IMAGES} allowed.` };
  const images: string[] = [];
  for (let i = 0; i < v.length; i++) {
    const raw = v[i];
    if (typeof raw !== "string") return { error: `images[${i + 1}] must be a string.` };
    const url = raw.trim();
    if (!url) return { error: `images[${i + 1}] is empty.` };
    if (url.length > MAX_IMAGE_URL_LEN) return { error: `images[${i + 1}] is longer than ${MAX_IMAGE_URL_LEN} chars.` };
    if (!parseHttpsUrl(url)) return { error: `images[${i + 1}] must be an https:// URL.` };
    images.push(url);
  }
  return { images };
}

/** Array of non-empty strings (trimmed, blanks dropped), or null when invalid. */
export function featuresList(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length > MAX_FEATURES) return null;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return null;
    const s = item.trim();
    if (!s) continue;
    if (s.length > MAX_FEATURE_LEN) return null;
    out.push(s);
  }
  return out;
}

/** Postgres unique-violation → 409 with a field-specific message, else null. */
export function uniqueConflict(error: { code?: string; message?: string } | null): NextResponse | null {
  if (!error || error.code !== "23505") return null;
  const msg = error.message ?? "";
  const field = msg.includes("products_slug_key")
    ? "Slug already in use."
    : msg.includes("products_sku_key")
      ? "SKU already in use."
      : "A product with that value already exists.";
  return NextResponse.json({ error: field }, { status: 409 });
}
