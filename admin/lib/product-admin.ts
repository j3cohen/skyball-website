// lib/product-admin.ts
// Shared (client + server) types and helpers for the admin Products section.
// Product rows live in the website project's `products` table; images are a
// jsonb array of absolute URLs (files are uploaded to S3 by hand, see
// docs/admin-products.md). Keep this file free of server-only imports.

export const PRODUCT_KINDS = ["base", "addon", "bundle"] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

/**
 * Hosts the public site can render through next/image — must match
 * `images.domains` in the root next.config.js. A URL on any other host saves
 * fine but renders as a broken image on skyball.us, so the editor warns.
 */
export const ALLOWED_IMAGE_HOSTS = [
  "jbcpublicbucket.s3.us-east-1.amazonaws.com",
  "hebbkx1anhila5yf.public.blob.vercel-storage.com",
] as const;

export const S3_BUCKET_HOST = ALLOWED_IMAGE_HOSTS[0];
export const S3_SHOP_PREFIX = "skyball-shop/";

export type AdminPrice = {
  id: string;
  label: string | null;
  unit_amount: number;
  currency: string;
  active: boolean;
  stripe_price_id: string | null;
};

/** Row shape returned by GET /api/admin/products. */
export type AdminProductRow = {
  id: string;
  sku: number | null;
  slug: string;
  name: string;
  kind: ProductKind;
  active: boolean;
  sort_order: number;
  updated_at: string;
  first_image: string | null;
  image_count: number;
  has_active_price: boolean;
};

/** Full row returned by GET /api/admin/products/[id]. */
export type AdminProduct = {
  id: string;
  sku: number | null;
  slug: string;
  name: string;
  description: string | null;
  details: string | null;
  features: string[] | null;
  kind: ProductKind;
  active: boolean;
  images: unknown;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Keep only the string entries of a JSON/array column value. */
export function toImageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** Trimmed, non-empty URLs — what gets sent to the API. */
export function cleanImageList(images: string[]): string[] {
  return images.map((url) => url.trim()).filter((url) => url.length > 0);
}

/** lowercase, non-alphanumerics collapsed to "-", trimmed, max 80 chars. */
export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** Parses as an https URL (what the API accepts). */
export function parseHttpsUrl(url: string): URL | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** True when the site can render this URL (https + allowed host). */
export function imageHostAllowed(url: string): boolean {
  const u = parseHttpsUrl(url);
  return !!u && (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(u.hostname);
}

export function formatPrice(unitAmount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(unitAmount / 100);
  } catch {
    return `${(unitAmount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
