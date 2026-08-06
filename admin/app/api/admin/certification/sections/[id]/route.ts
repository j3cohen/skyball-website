// PATCH  /api/admin/certification/sections/[id] — update section fields
// DELETE /api/admin/certification/sections/[id] — delete section (+questions via cascade)

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
  if (b.intro_enabled !== undefined) {
    if (typeof b.intro_enabled !== "boolean") return badRequest("intro_enabled must be boolean.");
    update.intro_enabled = b.intro_enabled;
  }
  if (b.intro_title !== undefined) update.intro_title = optionalString(b.intro_title, 300) ?? null;
  if (b.intro_body !== undefined) update.intro_body = optionalString(b.intro_body, 10_000) ?? null;
  if (b.video_url !== undefined) update.video_url = optionalString(b.video_url, 500) ?? null;

  // Per-section overrides: explicit null clears back to the program default.
  if (b.pass_threshold_type !== undefined) {
    if (b.pass_threshold_type === null) update.pass_threshold_type = null;
    else {
      const v = thresholdType(b.pass_threshold_type);
      if (!v) return badRequest("pass_threshold_type must be 'percent', 'count', or null.");
      update.pass_threshold_type = v;
    }
  }
  if (b.pass_threshold_value !== undefined) {
    if (b.pass_threshold_value === null) update.pass_threshold_value = null;
    else {
      const v = intInRange(b.pass_threshold_value, 0, 1000);
      if (v === null) return badRequest("pass_threshold_value must be a non-negative integer or null.");
      update.pass_threshold_value = v;
    }
  }
  if (b.retake_cooldown_minutes !== undefined) {
    if (b.retake_cooldown_minutes === null) update.retake_cooldown_minutes = null;
    else {
      const v = intInRange(b.retake_cooldown_minutes, 0, 60 * 24 * 30);
      if (v === null) return badRequest("retake_cooldown_minutes must be 0–43200 or null.");
      update.retake_cooldown_minutes = v;
    }
  }

  if (Object.keys(update).length === 0) return badRequest("Nothing to update.");

  const { data, error } = await certDb
    .from("cert_sections")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    console.error("cert section update error:", error);
    return NextResponse.json({ error: "Failed to update section." }, { status: 500 });
  }

  return NextResponse.json({ section: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { error } = await certDb.from("cert_sections").delete().eq("id", params.id);

  if (error) {
    console.error("cert section delete error:", error);
    return NextResponse.json({ error: "Failed to delete section." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
