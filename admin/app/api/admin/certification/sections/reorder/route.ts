// POST /api/admin/certification/sections/reorder — set section order
// Body: { program_id, ordered_ids: string[] }

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import {
  badRequest,
  guardCertAdmin,
  readJson,
  requiredString,
} from "@/lib/server/certGuard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const b = (body ?? {}) as Record<string, unknown>;

  const programId = requiredString(b.program_id, 100);
  const orderedIds = b.ordered_ids;
  if (!programId) return badRequest("program_id is required.");
  if (
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0 ||
    orderedIds.length > 200 ||
    orderedIds.some((v) => typeof v !== "string")
  ) {
    return badRequest("ordered_ids must be a non-empty string array.");
  }

  // Scope check: every id must belong to this program.
  const { data: existing } = await certDb
    .from("cert_sections")
    .select("id")
    .eq("program_id", programId);
  const validIds = new Set((existing ?? []).map((s) => s.id));
  if (!(orderedIds as string[]).every((id) => validIds.has(id))) {
    return badRequest("ordered_ids contains sections not in this program.");
  }

  // position has no unique constraint, so simple per-row updates suffice.
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await certDb
      .from("cert_sections")
      .update({ position: i })
      .eq("id", orderedIds[i] as string);
    if (error) {
      console.error("cert section reorder error:", error);
      return NextResponse.json({ error: "Failed to reorder sections." }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
