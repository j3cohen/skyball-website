// GET  /api/admin/products — every shop product (active + inactive) with a
//      thumbnail and whether it has an active price (no price = hidden on site)
// POST /api/admin/products — create a product (starts inactive, no images)
//
// Writes go through the service-role client; the public site reads the same
// `products` rows with the anon key (app/shop, app/products/[slug]) and is
// force-dynamic, so edits show on the next request.

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import { badRequest, guardCertAdmin, readJson, requiredString } from "@/lib/server/certGuard";
import { productKind, slugField, uniqueConflict } from "@/lib/server/productGuard";
import { normalizeSlug, toImageList, type AdminProductRow } from "@/lib/product-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { data, error } = await certDb
    .from("products")
    .select("id, sku, slug, name, kind, active, sort_order, images, updated_at, product_prices(id, active)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("admin products list error:", error);
    return NextResponse.json({ error: "Failed to fetch products." }, { status: 500 });
  }

  // Cast: embedded relations defeat the untyped client's select-string types.
  const rows = (data ?? []) as unknown as (Omit<AdminProductRow, "first_image" | "image_count" | "has_active_price"> & {
    images: unknown;
    product_prices: { id: string; active: boolean }[] | null;
  })[];

  const products: AdminProductRow[] = rows.map((p) => {
    const { images, product_prices, ...rest } = p;
    const list = toImageList(images);
    return {
      ...rest,
      first_image: list[0] ?? null,
      image_count: list.length,
      has_active_price: (product_prices ?? []).some((pr) => pr.active),
    };
  });

  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const b = (body ?? {}) as Record<string, unknown>;

  const name = requiredString(b.name, 200);
  if (!name) return badRequest("name is required.");

  // Owner picks the slug (or we derive it from the name). No auto-suffixing:
  // a clash is a 409 so the admin chooses deliberately — slugs are public URLs.
  const slug = b.slug === undefined || b.slug === "" ? normalizeSlug(name) : slugField(b.slug);
  if (!slug) return badRequest("slug must contain letters or numbers.");

  const kind = b.kind === undefined ? "base" : productKind(b.kind);
  if (!kind) return badRequest("kind must be base, addon, or bundle.");

  const { data, error } = await certDb
    .from("products")
    .insert({ name, slug, kind, active: false, images: [] })
    .select()
    .single();

  if (error || !data) {
    const conflict = uniqueConflict(error);
    if (conflict) return conflict;
    console.error("admin product create error:", error);
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
