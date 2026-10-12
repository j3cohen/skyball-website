// GET   /api/admin/products/[id] — full product row + its price rows (read-only)
// PATCH /api/admin/products/[id] — partial update of images / text / flags
//
// No DELETE: orders reference products; set active=false instead.
// Prices are NOT editable here — they're Stripe price rows (product_prices).

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import {
  badRequest,
  guardCertAdmin,
  intInRange,
  optionalString,
  readJson,
  requiredString,
} from "@/lib/server/certGuard";
import {
  featuresList,
  imageUrlList,
  MAX_FEATURES,
  productKind,
  slugField,
  uniqueConflict,
} from "@/lib/server/productGuard";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { data: product, error } = await certDb
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const { data: prices } = await certDb
    .from("product_prices")
    .select("id, label, unit_amount, currency, active, stripe_price_id")
    .eq("product_id", params.id)
    .order("active", { ascending: false });

  return NextResponse.json({ product, prices: prices ?? [] });
}

export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const b = (body ?? {}) as Record<string, unknown>;

  const update: Record<string, unknown> = {};

  if (b.name !== undefined) {
    const v = requiredString(b.name, 200);
    if (!v) return badRequest("name cannot be empty.");
    update.name = v;
  }
  if (b.slug !== undefined) {
    const v = slugField(b.slug);
    if (!v) return badRequest("slug must contain letters or numbers.");
    update.slug = v;
  }
  if (b.kind !== undefined) {
    const v = productKind(b.kind);
    if (!v) return badRequest("kind must be base, addon, or bundle.");
    update.kind = v;
  }
  if (b.description !== undefined) {
    update.description = optionalString(b.description, 10_000)?.trim() || null;
  }
  if (b.details !== undefined) {
    update.details = optionalString(b.details, 20_000)?.trim() || null;
  }
  if (b.features !== undefined) {
    const v = featuresList(b.features);
    if (v === null) return badRequest(`features must be up to ${MAX_FEATURES} short strings.`);
    update.features = v;
  }
  if (b.images !== undefined) {
    const v = imageUrlList(b.images);
    if (v.error) return badRequest(v.error);
    update.images = v.images;
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") return badRequest("active must be true or false.");
    update.active = b.active;
  }
  if (b.sort_order !== undefined) {
    const v = intInRange(b.sort_order, -100_000, 100_000);
    if (v === null) return badRequest("sort_order must be an integer between -100000 and 100000.");
    update.sort_order = v;
  }
  if (b.sku !== undefined) {
    if (b.sku === null || b.sku === "") {
      update.sku = null;
    } else {
      const v = intInRange(b.sku, 1, 2_147_483_647);
      if (v === null) return badRequest("sku must be a positive integer or blank.");
      update.sku = v;
    }
  }

  if (Object.keys(update).length === 0) return badRequest("Nothing to update.");

  const { data, error } = await certDb
    .from("products")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    const conflict = uniqueConflict(error);
    if (conflict) return conflict;
    console.error("admin product update error:", error);
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}
