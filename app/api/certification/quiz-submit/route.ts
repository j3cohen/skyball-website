// app/api/certification/quiz-submit/route.ts
// POST { sectionId, answers: [{ questionId, choiceIndex }] }
// Grades server-side against cert_questions, enforces the retake
// cooldown (429 + retryAt), records the attempt, and — per owner
// decision — returns the FULL answer reveal (correct answers +
// optional explanations) with the graded result.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getCertLearner } from "@/lib/server/certLearnerAuth";
import { rateLimitResponse } from "@/lib/server/rateLimiter";
import {
  allSectionsPassed,
  cooldownUntil,
  effectiveRules,
  findActiveEnrollment,
  loadAttempts,
  loadProgramContent,
  requiredCorrect,
} from "@/lib/server/certCourse";

export const dynamic = "force-dynamic";

type Body = {
  sectionId?: string;
  answers?: { questionId?: string; choiceIndex?: number }[];
};

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "cert-quiz", 30);
  if (limited) return limited;
  try {
    const learner = await getCertLearner(request);
    if (!learner) {
      return NextResponse.json({ error: "Sign in to take the quiz." }, { status: 401 });
    }

    const { sectionId, answers } = (await request.json().catch(() => ({}))) as Body;
    if (!sectionId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Missing sectionId or answers." }, { status: 400 });
    }

    const enrollment = await findActiveEnrollment(learner.userId);
    if (!enrollment) {
      return NextResponse.json({ error: "No enrollment found." }, { status: 404 });
    }

    const content = await loadProgramContent(enrollment.program_id);
    if (!content) {
      return NextResponse.json({ error: "Course content unavailable." }, { status: 500 });
    }
    const section = content.sections.find((s) => s.id === sectionId);
    if (!section) {
      return NextResponse.json({ error: "Section not in your course." }, { status: 404 });
    }

    const questions = content.questions.filter((q) => q.section_id === sectionId);
    if (questions.length === 0) {
      return NextResponse.json({ error: "This section has no quiz." }, { status: 400 });
    }

    const attempts = await loadAttempts(enrollment.id);
    const sectionAttempts = attempts.filter((a) => a.section_id === sectionId);

    if (sectionAttempts.some((a) => a.passed)) {
      return NextResponse.json(
        { error: "You already passed this section." },
        { status: 409 }
      );
    }

    const rules = effectiveRules(content.program, section);
    const retryAt = cooldownUntil(sectionAttempts, rules.cooldownMinutes);
    if (retryAt) {
      return NextResponse.json(
        { error: "Retake not available yet.", retryAt },
        { status: 429 }
      );
    }

    // ── Grade ─────────────────────────────────────────────────────
    const answerMap = new Map<string, number>();
    for (const a of answers) {
      if (typeof a?.questionId === "string" && typeof a?.choiceIndex === "number") {
        answerMap.set(a.questionId, a.choiceIndex);
      }
    }

    const results = questions.map((q) => {
      const yourChoice = answerMap.get(q.id) ?? -1;
      return {
        questionId: q.id,
        yourChoice,
        correctIndex: q.correct_index,
        correct: yourChoice === q.correct_index,
        explanation: q.explanation,
      };
    });
    const correctCount = results.filter((r) => r.correct).length;
    const needed = requiredCorrect(rules.thresholdType, rules.thresholdValue, questions.length);
    const passed = correctCount >= needed;

    const { error: attemptErr } = await supabaseAdmin.from("cert_quiz_attempts").insert({
      enrollment_id: enrollment.id,
      section_id: sectionId,
      attempt_number: sectionAttempts.length + 1,
      answers: results.map((r) => ({ question_id: r.questionId, choice_index: r.yourChoice })),
      correct_count: correctCount,
      question_count: questions.length,
      passed,
    });
    if (attemptErr) {
      console.error("cert attempt insert failed:", attemptErr);
      return NextResponse.json({ error: "Could not record your attempt." }, { status: 500 });
    }

    // ── Completion check ──────────────────────────────────────────
    let enrollmentCompleted = false;
    if (passed && enrollment.status !== "completed") {
      const updatedAttempts = [
        { id: "new", section_id: sectionId, attempt_number: 0, correct_count: correctCount, question_count: questions.length, passed: true, created_at: new Date().toISOString() },
        ...attempts,
      ];
      if (allSectionsPassed(content.sections, content.questions, updatedAttempts)) {
        enrollmentCompleted = true;
        await supabaseAdmin
          .from("cert_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollment.id);
      }
    }

    const failRetryAt =
      !passed && rules.cooldownMinutes > 0
        ? new Date(Date.now() + rules.cooldownMinutes * 60_000).toISOString()
        : null;

    return NextResponse.json({
      correctCount,
      total: questions.length,
      passed,
      results,
      retryAt: failRetryAt,
      enrollmentCompleted,
    });
  } catch (err) {
    console.error("⚠️ /api/certification/quiz-submit error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
