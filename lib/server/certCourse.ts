// lib/server/certCourse.ts
// Server-side course logic shared by the learner API routes: find the
// learner's enrollment, resolve effective pass rules, and build the
// course outline WITHOUT correct answers (grading stays server-side —
// correct_index/explanation only appear in graded quiz responses).

import "server-only";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import {
  extractYouTubeId,
  requiredCorrect,
  type CourseOutline,
  type CourseSection,
  type PassThresholdType,
} from "@/lib/certification/types";

export type ProgramRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  pass_threshold_type: PassThresholdType;
  pass_threshold_value: number;
  retake_cooldown_minutes: number;
  expiry_months: number;
  status: string;
};

export type SectionRow = {
  id: string;
  program_id: string;
  position: number;
  title: string;
  intro_enabled: boolean;
  intro_title: string | null;
  intro_body: string | null;
  video_url: string | null;
  pass_threshold_type: PassThresholdType | null;
  pass_threshold_value: number | null;
  retake_cooldown_minutes: number | null;
};

export type QuestionRow = {
  id: string;
  section_id: string;
  position: number;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string | null;
};

export type AttemptRow = {
  id: string;
  section_id: string;
  attempt_number: number;
  correct_count: number;
  question_count: number;
  passed: boolean;
  created_at: string;
};

export type EnrollmentRow = {
  id: string;
  seat_id: string;
  program_id: string;
  user_id: string;
  status: "in_progress" | "completed";
};

/**
 * The learner's newest enrollment whose seat has not been revoked.
 * (Seat revocation is the admin's kill switch for access.)
 */
export async function findActiveEnrollment(userId: string): Promise<EnrollmentRow | null> {
  const { data } = await supabaseAdmin
    .from("cert_enrollments")
    .select("id, seat_id, program_id, user_id, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const enrollments = (data ?? []) as (EnrollmentRow & { created_at: string })[];
  if (enrollments.length === 0) return null;

  const { data: seats } = await supabaseAdmin
    .from("cert_seats")
    .select("id, status")
    .in("id", enrollments.map((e) => e.seat_id));
  const revoked = new Set(
    ((seats ?? []) as { id: string; status: string }[])
      .filter((s) => s.status === "revoked")
      .map((s) => s.id)
  );

  return enrollments.find((e) => !revoked.has(e.seat_id)) ?? null;
}

export function effectiveRules(program: ProgramRow, section: SectionRow) {
  return {
    thresholdType: section.pass_threshold_type ?? program.pass_threshold_type,
    thresholdValue: section.pass_threshold_value ?? program.pass_threshold_value,
    cooldownMinutes: section.retake_cooldown_minutes ?? program.retake_cooldown_minutes,
  };
}

/** Retake-cooldown expiry for a section, or null when retakes are open. */
export function cooldownUntil(
  attempts: AttemptRow[],
  cooldownMinutes: number
): string | null {
  if (cooldownMinutes <= 0) return null;
  if (attempts.some((a) => a.passed)) return null;
  const latest = attempts[0]; // caller sorts newest-first
  if (!latest) return null;
  const until = new Date(latest.created_at).getTime() + cooldownMinutes * 60_000;
  return until > Date.now() ? new Date(until).toISOString() : null;
}

export async function loadProgramContent(programId: string) {
  const { data: program } = await supabaseAdmin
    .from("cert_programs")
    .select("*")
    .eq("id", programId)
    .single<ProgramRow>();
  if (!program) return null;

  const { data: sections } = await supabaseAdmin
    .from("cert_sections")
    .select("*")
    .eq("program_id", programId)
    .order("position", { ascending: true });

  const sectionRows = (sections ?? []) as SectionRow[];
  const { data: questions } = sectionRows.length
    ? await supabaseAdmin
        .from("cert_questions")
        .select("*")
        .in("section_id", sectionRows.map((s) => s.id))
        .order("position", { ascending: true })
    : { data: [] };

  return {
    program,
    sections: sectionRows,
    questions: (questions ?? []) as QuestionRow[],
  };
}

export async function loadAttempts(enrollmentId: string): Promise<AttemptRow[]> {
  const { data } = await supabaseAdmin
    .from("cert_quiz_attempts")
    .select("id, section_id, attempt_number, correct_count, question_count, passed, created_at")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AttemptRow[];
}

/** Build the sanitized learner-facing outline (no answers). */
export async function buildCourseOutline(
  enrollment: EnrollmentRow
): Promise<CourseOutline | null> {
  const content = await loadProgramContent(enrollment.program_id);
  if (!content) return null;
  const { program, sections, questions } = content;

  const attempts = await loadAttempts(enrollment.id);
  const bySection = new Map<string, AttemptRow[]>();
  for (const a of attempts) {
    const list = bySection.get(a.section_id) ?? [];
    list.push(a); // already newest-first
    bySection.set(a.section_id, list);
  }

  const outlineSections: CourseSection[] = sections.map((s) => {
    const rules = effectiveRules(program, s);
    const secAttempts = bySection.get(s.id) ?? [];
    const secQuestions = questions.filter((q) => q.section_id === s.id);
    // Sections without questions auto-pass (video/intro only).
    const passed = secQuestions.length === 0 ? true : secAttempts.some((a) => a.passed);
    const best = secAttempts.reduce<number | null>(
      (max, a) => (max === null || a.correct_count > max ? a.correct_count : max),
      null
    );
    return {
      id: s.id,
      title: s.title,
      position: s.position,
      introEnabled: s.intro_enabled,
      introTitle: s.intro_title,
      introBody: s.intro_body,
      youtubeId: s.video_url ? extractYouTubeId(s.video_url) : null,
      questions: secQuestions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        choices: Array.isArray(q.choices) ? q.choices : [],
      })),
      passThresholdType: rules.thresholdType,
      passThresholdValue: rules.thresholdValue,
      retakeCooldownMinutes: rules.cooldownMinutes,
      passed,
      attemptCount: secAttempts.length,
      bestCorrectCount: best,
      cooldownUntil: cooldownUntil(secAttempts, rules.cooldownMinutes),
    };
  });

  const { data: cert } = await supabaseAdmin
    .from("cert_certifications")
    .select("verify_code, full_name, issued_at, expires_at, status")
    .eq("enrollment_id", enrollment.id)
    .maybeSingle<{
      verify_code: string;
      full_name: string;
      issued_at: string;
      expires_at: string;
      status: string;
    }>();

  return {
    programTitle: program.title,
    programDescription: program.description,
    enrollmentStatus: enrollment.status,
    sections: outlineSections,
    certificate:
      cert && cert.status === "active"
        ? {
            verifyCode: cert.verify_code,
            fullName: cert.full_name,
            issuedAt: cert.issued_at,
            expiresAt: cert.expires_at,
          }
        : null,
  };
}

/** True when every section with questions has a passing attempt. */
export function allSectionsPassed(
  sections: SectionRow[],
  questions: QuestionRow[],
  attempts: AttemptRow[]
): boolean {
  const passedSections = new Set(attempts.filter((a) => a.passed).map((a) => a.section_id));
  return sections.every((s) => {
    const hasQuestions = questions.some((q) => q.section_id === s.id);
    return !hasQuestions || passedSections.has(s.id);
  });
}

export { requiredCorrect };
