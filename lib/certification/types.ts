// lib/certification/types.ts
// Shared shapes for the coaching-certification learner flow.
// CourseOutline mirrors the GET /api/certification/course payload:
// note it deliberately carries NO correct answers — grading happens
// server-side and correct answers only appear in QuizSubmitResult.

export type PassThresholdType = "percent" | "count";

export type CourseQuestion = {
  id: string;
  prompt: string;
  choices: string[];
};

export type CourseSection = {
  id: string;
  title: string;
  position: number;
  introEnabled: boolean;
  introTitle: string | null;
  introBody: string | null;
  /** YouTube video id (already extracted server-side), null if not set */
  youtubeId: string | null;
  questions: CourseQuestion[];
  passThresholdType: PassThresholdType;
  passThresholdValue: number;
  retakeCooldownMinutes: number;
  /** derived: any passed attempt exists */
  passed: boolean;
  attemptCount: number;
  bestCorrectCount: number | null;
  /** ISO timestamp; retakes blocked until then (null = can retake now) */
  cooldownUntil: string | null;
};

export type CourseCertificate = {
  verifyCode: string;
  fullName: string;
  issuedAt: string;
  expiresAt: string;
};

export type CourseOutline = {
  programTitle: string;
  programDescription: string | null;
  enrollmentStatus: "in_progress" | "completed";
  sections: CourseSection[];
  certificate: CourseCertificate | null;
};

export type QuizAnswer = {
  questionId: string;
  choiceIndex: number;
};

export type QuizQuestionResult = {
  questionId: string;
  yourChoice: number;
  correctIndex: number;
  correct: boolean;
  explanation: string | null;
};

export type QuizSubmitResult = {
  correctCount: number;
  total: number;
  passed: boolean;
  results: QuizQuestionResult[];
  /** set when a retake cooldown applies after a failed attempt */
  retryAt: string | null;
  enrollmentCompleted: boolean;
};

/** Extract a YouTube video id from any common URL form (or a bare id). */
export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /youtube\.com\/watch\?.*v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

/**
 * The content steps a section actually has, in learner order. A section may
 * carry any combination of intro slide, video, and quiz — including none of
 * them — so the player walks this list rather than assuming intro→video→quiz.
 */
export type SectionStep = "intro" | "video" | "quiz";

export function stepsFor(section: {
  introEnabled: boolean;
  youtubeId: string | null;
  questions: unknown[];
}): SectionStep[] {
  const steps: SectionStep[] = [];
  if (section.introEnabled) steps.push("intro");
  if (section.youtubeId) steps.push("video");
  if (section.questions.length > 0) steps.push("quiz");
  return steps;
}

/** True when the section has a quiz to take (vs. video/intro only). */
export function hasQuiz(section: { questions: unknown[] }): boolean {
  return section.questions.length > 0;
}

/** Number correct required to pass, given a threshold and question count. */
export function requiredCorrect(
  type: PassThresholdType,
  value: number,
  questionCount: number
): number {
  if (questionCount <= 0) return 0;
  if (type === "count") return Math.min(value, questionCount);
  return Math.ceil((value / 100) * questionCount);
}
