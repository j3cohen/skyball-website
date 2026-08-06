// GET /api/admin/certification/sections/[id]/questions — list (with answers, admin-only)
// PUT /api/admin/certification/sections/[id]/questions — full-list replace
//
// Full replace (delete + insert in order) matches the repeating-array
// editor: the admin edits the whole question list locally and saves it
// in one shot. Past quiz attempts are unaffected — they snapshot
// correct_count/question_count at grading time and answers are jsonb
// (no FK to cert_questions).

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

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { data, error } = await certDb
    .from("cert_questions")
    .select("*")
    .eq("section_id", params.id)
    .order("position", { ascending: true });

  if (error) {
    console.error("cert questions list error:", error);
    return NextResponse.json({ error: "Failed to fetch questions." }, { status: 500 });
  }

  return NextResponse.json({ questions: data ?? [] });
}

export async function PUT(req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const { questions } = (body ?? {}) as { questions?: unknown };

  if (!Array.isArray(questions) || questions.length > 100) {
    return badRequest("questions must be an array (max 100).");
  }

  // Validate every question before touching the DB.
  const rows: {
    section_id: string;
    position: number;
    prompt: string;
    choices: string[];
    correct_index: number;
    explanation: string | null;
  }[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (typeof q !== "object" || q === null) return badRequest(`Question ${i + 1} is invalid.`);
    const { prompt, choices, correct_index, explanation } = q as Record<string, unknown>;

    const cleanPrompt = requiredString(prompt, 2000);
    if (!cleanPrompt) return badRequest(`Question ${i + 1}: prompt is required.`);

    if (
      !Array.isArray(choices) ||
      choices.length < 2 ||
      choices.length > 6 ||
      choices.some((c) => typeof c !== "string" || !c.trim())
    ) {
      return badRequest(`Question ${i + 1}: choices must be 2–6 non-empty strings.`);
    }

    const cleanCorrect = intInRange(correct_index, 0, choices.length - 1);
    if (cleanCorrect === null) {
      return badRequest(`Question ${i + 1}: correct_index must point at a choice.`);
    }

    rows.push({
      section_id: params.id,
      position: i,
      prompt: cleanPrompt,
      choices: (choices as string[]).map((c) => c.trim().slice(0, 500)),
      correct_index: cleanCorrect,
      explanation: optionalString(explanation, 2000) ?? null,
    });
  }

  // Verify the section exists before replacing.
  const { data: section } = await certDb
    .from("cert_sections")
    .select("id")
    .eq("id", params.id)
    .single();
  if (!section) return NextResponse.json({ error: "Section not found." }, { status: 404 });

  const { error: delError } = await certDb
    .from("cert_questions")
    .delete()
    .eq("section_id", params.id);
  if (delError) {
    console.error("cert questions delete error:", delError);
    return NextResponse.json({ error: "Failed to save questions." }, { status: 500 });
  }

  if (rows.length === 0) return NextResponse.json({ questions: [] });

  const { data, error } = await certDb
    .from("cert_questions")
    .insert(rows)
    .select();

  if (error) {
    console.error("cert questions insert error:", error);
    return NextResponse.json({ error: "Failed to save questions." }, { status: 500 });
  }

  const sorted = (data ?? []).sort((a, b) => a.position - b.position);
  return NextResponse.json({ questions: sorted });
}
