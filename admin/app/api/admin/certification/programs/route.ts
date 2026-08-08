// GET  /api/admin/certification/programs — list programs with counts
// POST /api/admin/certification/programs — create a program (draft)

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import {
  badRequest,
  guardCertAdmin,
  readJson,
  requiredString,
} from "@/lib/server/certGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { data, error } = await certDb
    .from("cert_programs")
    .select(
      "id, slug, title, description, pass_threshold_type, pass_threshold_value, " +
        "retake_cooldown_minutes, expiry_months, status, created_at, updated_at, " +
        "cert_sections(id), cert_offers(id), cert_purchases(id)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("cert programs list error:", error);
    return NextResponse.json({ error: "Failed to fetch programs." }, { status: 500 });
  }

  // Cast: embedded relations defeat the untyped client's select-string types.
  const rows = (data ?? []) as unknown as (Record<string, unknown> & {
    cert_sections: { id: string }[];
    cert_offers: { id: string }[];
    cert_purchases: { id: string }[];
  })[];
  const programs = rows.map((p) => {
    const { cert_sections, cert_offers, cert_purchases, ...rest } = p;
    return {
      ...rest,
      section_count: cert_sections?.length ?? 0,
      offer_count: cert_offers?.length ?? 0,
      purchase_count: cert_purchases?.length ?? 0,
    };
  });

  return NextResponse.json({ programs });
}

export async function POST(req: Request) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const { title } = (body ?? {}) as Record<string, unknown>;

  const cleanTitle = requiredString(title, 200);
  if (!cleanTitle) return badRequest("title is required.");

  const slug =
    cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "program";

  // Suffix the slug if taken (slug is UNIQUE).
  const { data: existing } = await certDb
    .from("cert_programs")
    .select("slug")
    .like("slug", `${slug}%`);
  const taken = new Set((existing ?? []).map((r) => r.slug));
  let finalSlug = slug;
  for (let i = 2; taken.has(finalSlug); i++) finalSlug = `${slug}-${i}`;

  const { data, error } = await certDb
    .from("cert_programs")
    .insert({ title: cleanTitle, slug: finalSlug })
    .select()
    .single();

  if (error) {
    console.error("cert program create error:", error);
    return NextResponse.json({ error: "Failed to create program." }, { status: 500 });
  }

  return NextResponse.json({ program: data });
}
