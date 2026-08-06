// GET /api/admin/certification/product-names — shop product names for
// the offer equipment-line autocomplete (suggestions only; lines stay
// free text by design).

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import { guardCertAdmin } from "@/lib/server/certGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { data, error } = await certDb
    .from("products")
    .select("name")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("cert product-names error:", error);
    return NextResponse.json({ error: "Failed to fetch product names." }, { status: 500 });
  }

  return NextResponse.json({ names: (data ?? []).map((p) => p.name) });
}
