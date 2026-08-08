// POST /api/admin/certification/sections — add a section to a program

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
  const title = requiredString(b.title, 200);
  if (!programId) return badRequest("program_id is required.");
  if (!title) return badRequest("title is required.");

  const { data: last } = await certDb
    .from("cert_sections")
    .select("position")
    .eq("program_id", programId)
    .order("position", { ascending: false })
    .limit(1);

  const { data, error } = await certDb
    .from("cert_sections")
    .insert({
      program_id: programId,
      title,
      position: (last?.[0]?.position ?? -1) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error("cert section create error:", error);
    return NextResponse.json({ error: "Failed to create section." }, { status: 500 });
  }

  return NextResponse.json({ section: data });
}
