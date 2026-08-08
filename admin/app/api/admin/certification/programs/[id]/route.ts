// GET    /api/admin/certification/programs/[id] — full program detail
// PATCH  /api/admin/certification/programs/[id] — update settings/status
// DELETE /api/admin/certification/programs/[id] — delete (blocked by FK
//        once purchases exist — archive instead)

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import {
  badRequest,
  guardCertAdmin,
  intInRange,
  optionalString,
  readJson,
  requiredString,
  thresholdType,
} from "@/lib/server/certGuard";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { data: program, error } = await certDb
    .from("cert_programs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !program) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }

  const [{ data: offers }, { data: sections }] = await Promise.all([
    certDb
      .from("cert_offers")
      .select("*")
      .eq("program_id", params.id)
      .order("position", { ascending: true }),
    certDb
      .from("cert_sections")
      .select("*, cert_questions(*)")
      .eq("program_id", params.id)
      .order("position", { ascending: true }),
  ]);

  // Order nested questions by position (PostgREST doesn't order embeds here).
  const orderedSections = (sections ?? []).map((s) => ({
    ...s,
    cert_questions: [...((s as { cert_questions?: { position: number }[] }).cert_questions ?? [])].sort(
      (a, b) => a.position - b.position
    ),
  }));

  return NextResponse.json({
    program,
    offers: offers ?? [],
    sections: orderedSections,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const b = (body ?? {}) as Record<string, unknown>;

  const update: Record<string, unknown> = {};

  if (b.title !== undefined) {
    const v = requiredString(b.title, 200);
    if (!v) return badRequest("title cannot be empty.");
    update.title = v;
  }
  if (b.description !== undefined) {
    update.description = optionalString(b.description, 5000) ?? null;
  }
  if (b.pass_threshold_type !== undefined) {
    const v = thresholdType(b.pass_threshold_type);
    if (!v) return badRequest("pass_threshold_type must be 'percent' or 'count'.");
    update.pass_threshold_type = v;
  }
  if (b.pass_threshold_value !== undefined) {
    const v = intInRange(b.pass_threshold_value, 0, 1000);
    if (v === null) return badRequest("pass_threshold_value must be a non-negative integer.");
    update.pass_threshold_value = v;
  }
  if (b.retake_cooldown_minutes !== undefined) {
    const v = intInRange(b.retake_cooldown_minutes, 0, 60 * 24 * 30);
    if (v === null) return badRequest("retake_cooldown_minutes must be 0–43200.");
    update.retake_cooldown_minutes = v;
  }
  if (b.expiry_months !== undefined) {
    const v = intInRange(b.expiry_months, 1, 1200);
    if (v === null) return badRequest("expiry_months must be 1–1200.");
    update.expiry_months = v;
  }
  if (b.status !== undefined) {
    if (b.status !== "draft" && b.status !== "published" && b.status !== "archived") {
      return badRequest("status must be draft, published, or archived.");
    }
    update.status = b.status;
  }

  if (Object.keys(update).length === 0) return badRequest("Nothing to update.");

  const { data, error } = await certDb
    .from("cert_programs")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    console.error("cert program update error:", error);
    return NextResponse.json({ error: "Failed to update program." }, { status: 500 });
  }

  return NextResponse.json({ program: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { error } = await certDb
    .from("cert_programs")
    .delete()
    .eq("id", params.id);

  if (error) {
    // FK restraint from cert_purchases — the program has sales history.
    return NextResponse.json(
      { error: "Cannot delete a program with purchases. Archive it instead." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
