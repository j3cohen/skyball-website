// components/certification/course-shell.tsx
// The click-through certification course experience. Pure client
// component: all data + actions arrive via props, so it renders
// identically from fixtures (mock mode) and the live API.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  hasQuiz,
  requiredCorrect,
  stepsFor,
  type CourseCertificate,
  type CourseOutline,
  type CourseSection,
  type QuizAnswer,
  type QuizSubmitResult,
  type SectionStep,
} from "@/lib/certification/types";

/**
 * "results" is player-local: it exists only after a quiz submission, so it is
 * never part of a section's content steps.
 */
type PlayerStep = SectionStep | "results";

const VISITED_KEY = "skyball_cert_visited_v1";

export type CourseShellProps = {
  course: CourseOutline;
  /** Grades server-side (or mock); throws Error with message on failure. */
  onSubmitQuiz: (sectionId: string, answers: QuizAnswer[]) => Promise<QuizSubmitResult>;
  /** Issues the certificate once the enrollment is complete. */
  onIssueCertificate: (fullName: string) => Promise<CourseCertificate>;
  /** Prefill for the certificate name input. */
  defaultFullName?: string;
};

/** "Video · Quiz (12 questions)" — so a module layout reads at a glance. */
function sectionSummary(section: CourseSection): string {
  const parts: string[] = [];
  if (section.introEnabled) parts.push("Intro");
  if (section.youtubeId) parts.push("Video");
  if (section.questions.length > 0) {
    parts.push(
      `Quiz (${section.questions.length} question${section.questions.length === 1 ? "" : "s"})`
    );
  }
  return parts.join(" · ");
}

function readVisited(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(VISITED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistVisited(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISITED_KEY, JSON.stringify([...ids]));
  } catch {
    // Private browsing / quota — visited marks are cosmetic, so ignore.
  }
}

/** "3:42" countdown text until an ISO timestamp; null when elapsed. */
function useCountdown(untilIso: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!untilIso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [untilIso]);
  if (!untilIso) return null;
  const remaining = new Date(untilIso).getTime() - now;
  if (remaining <= 0) return null;
  const totalSec = Math.ceil(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function CourseShell({
  course: initialCourse,
  onSubmitQuiz,
  onIssueCertificate,
  defaultFullName = "",
}: CourseShellProps) {
  const [course, setCourse] = useState(initialCourse);

  const allPassed = useMemo(
    () => course.sections.every((s) => s.passed),
    [course.sections]
  );

  // Always start at the first section — video-only sections auto-pass, so
  // "first unpassed" would skip straight past them to the quiz. A learner who
  // has already finished everything lands on the final screen instead.
  // null activeIndex = final results screen
  const [activeIndex, setActiveIndex] = useState<number | null>(
    allPassed ? null : 0
  );
  const active = activeIndex === null ? null : course.sections[activeIndex];

  const [step, setStep] = useState<PlayerStep>(() => {
    const first = course.sections[0];
    return first ? stepsFor(first)[0] ?? "intro" : "intro";
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read after mount: localStorage is unavailable during SSR and reading it
  // in render would produce a hydration mismatch.
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const stored = readVisited();
    const first = course.sections[0];
    if (first && !stored.has(first.id)) stored.add(first.id);
    setVisited(stored);
    persistVisited(stored);
    // Only on mount: later visits go through markVisited().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markVisited(sectionId: string) {
    setVisited((prev) => {
      if (prev.has(sectionId)) return prev;
      const next = new Set(prev).add(sectionId);
      persistVisited(next);
      return next;
    });
  }

  const cooldownText = useCountdown(
    result?.retryAt ?? active?.cooldownUntil ?? null
  );

  /** Content steps of the active section, in learner order. */
  const activeSteps = useMemo(() => (active ? stepsFor(active) : []), [active]);
  const stepIndex = activeSteps.indexOf(step as SectionStep);
  const isLastStep = stepIndex === activeSteps.length - 1;
  const isLastSection = activeIndex === course.sections.length - 1;

  function openSection(index: number) {
    const section = course.sections[index];
    setActiveIndex(index);
    // Always start at the section's first content step so the video is
    // reachable again, even once the section is passed.
    setStep(stepsFor(section)[0] ?? "intro");
    setAnswers({});
    setResult(null);
    setError(null);
    markVisited(section.id);
  }

  function openFinal() {
    setActiveIndex(null);
    setResult(null);
    setError(null);
  }

  function goNextSection() {
    const next = (activeIndex ?? -1) + 1;
    if (next < course.sections.length) openSection(next);
    else openFinal();
  }

  /** Advance within the section, or on to the next one when it's the last step. */
  function goForward() {
    if (stepIndex >= 0 && stepIndex < activeSteps.length - 1) {
      setStep(activeSteps[stepIndex + 1]);
    } else {
      goNextSection();
    }
  }

  function goBack() {
    if (stepIndex > 0) setStep(activeSteps[stepIndex - 1]);
  }

  /** Label for the single forward button on a content step. */
  const forwardLabel = !isLastStep
    ? "Continue"
    : isLastSection
      ? "See your results"
      : "Next section →";

  /** A section is reachable when every earlier section is passed. */
  function unlocked(index: number) {
    return course.sections.slice(0, index).every((s) => s.passed);
  }

  async function submitQuiz() {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: QuizAnswer[] = active.questions.map((q) => ({
        questionId: q.id,
        choiceIndex: answers[q.id],
      }));
      const res = await onSubmitQuiz(active.id, payload);
      setResult(res);
      setStep("results");
      setCourse((prev) => ({
        ...prev,
        enrollmentStatus: res.enrollmentCompleted ? "completed" : prev.enrollmentStatus,
        sections: prev.sections.map((s) =>
          s.id === active.id
            ? {
                ...s,
                passed: s.passed || res.passed,
                attemptCount: s.attemptCount + 1,
                bestCorrectCount: Math.max(s.bestCorrectCount ?? 0, res.correctCount),
                cooldownUntil: res.retryAt,
              }
            : s
        ),
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const answeredAll =
    active !== null && active.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Section stepper ─────────────────────────────── */}
      <nav className="lg:w-72 shrink-0">
        <ol className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          {course.sections.map((s, i) => {
            const isActive = activeIndex === i;
            const canOpen = unlocked(i);
            const quizzed = hasQuiz(s);
            // Green ✓ means a quiz was genuinely passed. A video/intro section
            // auto-passes on enrollment, so it gets a muted ✓ once opened —
            // the two must not look the same.
            const quizPassed = quizzed && s.passed;
            const watched = !quizzed && visited.has(s.id);
            return (
              <li key={s.id} className="min-w-[12rem] lg:min-w-0">
                <button
                  type="button"
                  onClick={() => canOpen && openSection(i)}
                  disabled={!canOpen}
                  className={cn(
                    "w-full text-left rounded-lg border px-4 py-3 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 bg-white hover:bg-gray-50",
                    !canOpen && "opacity-50 cursor-not-allowed hover:bg-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        quizPassed
                          ? "bg-green-600 text-white"
                          : watched
                            ? "bg-gray-300 text-gray-700"
                            : isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-gray-200 text-gray-600"
                      )}
                    >
                      {quizPassed || watched ? "✓" : i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {s.title}
                    </span>
                  </div>
                  <p className="mt-1 pl-8 text-xs text-gray-500">
                    {quizzed && s.attemptCount > 0
                      ? `Best: ${s.bestCorrectCount ?? 0}/${s.questions.length}${
                          s.passed ? " · Passed" : ""
                        }`
                      : sectionSummary(s)}
                  </p>
                </button>
              </li>
            );
          })}
          <li className="min-w-[12rem] lg:min-w-0">
            <button
              type="button"
              onClick={() => allPassed && openFinal()}
              disabled={!allPassed}
              className={cn(
                "w-full text-left rounded-lg border px-4 py-3 transition-colors",
                activeIndex === null
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 bg-white hover:bg-gray-50",
                !allPassed && "opacity-50 cursor-not-allowed hover:bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    allPassed ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
                  )}
                >
                  ★
                </span>
                <span className="text-sm font-medium text-gray-900">Results & Certificate</span>
              </div>
            </button>
          </li>
        </ol>
      </nav>

      {/* ── Active panel ────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {active === null ? (
          <FinalScreen
            course={course}
            defaultFullName={defaultFullName}
            onIssueCertificate={onIssueCertificate}
            onCertificate={(cert) =>
              setCourse((prev) => ({ ...prev, certificate: cert }))
            }
          />
        ) : (
          <div className="bg-white rounded-xl shadow p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Section {activeIndex! + 1} of {course.sections.length}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">{active.title}</h2>

            {/* A section with no intro, no video and no quiz — nothing to do
                but move on. Without this it fell through to an empty quiz. */}
            {activeSteps.length === 0 && (
              <div className="mt-6">
                <p className="text-gray-600">There&apos;s no content in this section yet.</p>
                <div className="mt-8">
                  <Button onClick={goNextSection}>
                    {isLastSection ? "See your results" : "Next section →"}
                  </Button>
                </div>
              </div>
            )}

            {/* Intro slide */}
            {step === "intro" && activeSteps.includes("intro") && (
              <div className="mt-6">
                {active.introTitle && (
                  <h3 className="text-lg font-semibold text-gray-900">{active.introTitle}</h3>
                )}
                <p className="mt-3 whitespace-pre-line text-gray-700">{active.introBody}</p>
                <div className="mt-8">
                  <Button onClick={goForward}>{forwardLabel}</Button>
                </div>
              </div>
            )}

            {/* Video */}
            {step === "video" && activeSteps.includes("video") && (
              <div className="mt-6">
                <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingTop: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${active.youtubeId}?rel=0&modestbranding=1`}
                    title={active.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="mt-6 flex items-center gap-3">
                  {stepIndex > 0 && (
                    <Button variant="outline" onClick={goBack}>
                      Back
                    </Button>
                  )}
                  <Button onClick={goForward}>
                    {isLastStep
                      ? forwardLabel
                      : `Continue to quiz (${active.questions.length} question${
                          active.questions.length === 1 ? "" : "s"
                        })`}
                  </Button>
                </div>
              </div>
            )}

            {/* Quiz */}
            {step === "quiz" && activeSteps.includes("quiz") && (
              <div className="mt-6">
                {active.passed ? (
                  // Re-reachable now that passed sections open at their first
                  // step. Resubmitting would 409 server-side, so no form here.
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <p className="font-semibold text-green-800">
                      You&apos;ve already passed this section
                    </p>
                    {active.bestCorrectCount !== null && (
                      <p className="mt-0.5 text-sm text-green-700">
                        Best score: {active.bestCorrectCount} of {active.questions.length}.
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-3">
                      {active.youtubeId && (
                        <Button variant="outline" onClick={() => setStep("video")}>
                          Rewatch video
                        </Button>
                      )}
                      <Button onClick={goNextSection}>
                        {isLastSection ? "See your results" : "Next section →"}
                      </Button>
                    </div>
                  </div>
                ) : cooldownText ? (
                  <CooldownNotice text={cooldownText} />
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Pass mark:{" "}
                      <span className="font-medium text-gray-900">
                        {requiredCorrect(
                          active.passThresholdType,
                          active.passThresholdValue,
                          active.questions.length
                        )}{" "}
                        of {active.questions.length}
                      </span>
                      {active.retakeCooldownMinutes > 0 &&
                        ` · Retake wait: ${active.retakeCooldownMinutes} min`}
                    </p>
                    <ol className="mt-4 space-y-6">
                      {active.questions.map((q, qi) => (
                        <li key={q.id}>
                          <p className="font-medium text-gray-900">
                            {qi + 1}. {q.prompt}
                          </p>
                          <div className="mt-2 space-y-2">
                            {q.choices.map((choice, ci) => (
                              <label
                                key={ci}
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                                  answers[q.id] === ci
                                    ? "border-primary bg-primary/5"
                                    : "border-gray-200 hover:bg-gray-50"
                                )}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  checked={answers[q.id] === ci}
                                  onChange={() =>
                                    setAnswers((prev) => ({ ...prev, [q.id]: ci }))
                                  }
                                  className="h-4 w-4 accent-current"
                                />
                                <span className="text-gray-800">{choice}</span>
                              </label>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ol>
                    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
                    <div className="mt-6 flex items-center gap-3">
                      {active.youtubeId && (
                        <Button variant="outline" onClick={() => setStep("video")}>
                          Rewatch video
                        </Button>
                      )}
                      <Button onClick={submitQuiz} disabled={!answeredAll || submitting}>
                        {submitting ? "Grading…" : "Submit answers"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Section results */}
            {step === "results" && (
              <SectionResults
                section={active}
                result={result}
                cooldownText={cooldownText}
                onRetake={() => {
                  setAnswers({});
                  setResult(null);
                  setStep("quiz");
                }}
                onRewatch={() => setStep("video")}
                onNext={goNextSection}
                isLast={isLastSection}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CooldownNotice({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-medium text-amber-900">
        Retake available in <span className="font-mono">{text}</span>
      </p>
      <p className="mt-1 text-sm text-amber-800">
        Use the time to rewatch the video — the quiz will unlock automatically.
      </p>
    </div>
  );
}

function SectionResults({
  section,
  result,
  cooldownText,
  onRetake,
  onRewatch,
  onNext,
  isLast,
}: {
  section: CourseSection;
  result: QuizSubmitResult | null;
  cooldownText: string | null;
  onRetake: () => void;
  onRewatch: () => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const passed = result?.passed ?? section.passed;
  return (
    <div className="mt-6">
      <div
        className={cn(
          "rounded-lg px-4 py-3",
          passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
        )}
      >
        <p className={cn("font-semibold", passed ? "text-green-800" : "text-red-800")}>
          {passed ? "Section passed!" : "Not quite — review and retake"}
        </p>
        {result && (
          <p className={cn("mt-0.5 text-sm", passed ? "text-green-700" : "text-red-700")}>
            You scored {result.correctCount} of {result.total}. Pass mark:{" "}
            {requiredCorrect(
              section.passThresholdType,
              section.passThresholdValue,
              section.questions.length
            )}
            .
          </p>
        )}
      </div>

      {/* Full answer reveal with explanations */}
      {result && (
        <ol className="mt-6 space-y-4">
          {section.questions.map((q, qi) => {
            const r = result.results.find((x) => x.questionId === q.id);
            if (!r) return null;
            return (
              <li
                key={q.id}
                className={cn(
                  "rounded-lg border px-4 py-3",
                  r.correct ? "border-green-200" : "border-red-200"
                )}
              >
                <p className="font-medium text-gray-900">
                  {qi + 1}. {q.prompt}
                </p>
                <p className={cn("mt-1 text-sm", r.correct ? "text-green-700" : "text-red-700")}>
                  Your answer: {r.yourChoice >= 0 ? q.choices[r.yourChoice] : "—"}{" "}
                  {r.correct ? "✓" : "✗"}
                </p>
                {!r.correct && (
                  <p className="mt-0.5 text-sm text-gray-700">
                    Correct answer:{" "}
                    <span className="font-medium">{q.choices[r.correctIndex]}</span>
                  </p>
                )}
                {r.explanation && (
                  <p className="mt-1.5 text-sm text-gray-600 italic">{r.explanation}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 flex items-center gap-3">
        {section.youtubeId && (
          <Button variant="outline" onClick={onRewatch}>
            Rewatch video
          </Button>
        )}
        {passed ? (
          <Button onClick={onNext}>{isLast ? "See your results" : "Next section →"}</Button>
        ) : cooldownText ? (
          <CooldownNotice text={cooldownText} />
        ) : (
          <Button onClick={onRetake}>Retake quiz</Button>
        )}
      </div>
    </div>
  );
}

function FinalScreen({
  course,
  defaultFullName,
  onIssueCertificate,
  onCertificate,
}: {
  course: CourseOutline;
  defaultFullName: string;
  onIssueCertificate: (fullName: string) => Promise<CourseCertificate>;
  onCertificate: (cert: CourseCertificate) => void;
}) {
  const [fullName, setFullName] = useState(course.certificate?.fullName ?? defaultFullName);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cert = course.certificate;

  async function issue() {
    if (!fullName.trim()) {
      setError("Enter your full name as it should appear on the certificate.");
      return;
    }
    setIssuing(true);
    setError(null);
    try {
      const issued = await onIssueCertificate(fullName.trim());
      onCertificate(issued);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue the certificate. Try again.");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 md:p-8">
      <h2 className="text-2xl font-bold text-gray-900">
        {cert ? "You're certified! 🎉" : "Course complete!"}
      </h2>
      <p className="mt-2 text-gray-700">
        You passed every section of {course.programTitle}.
      </p>

      <ul className="mt-6 space-y-2">
        {course.sections.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5"
          >
            <span className="text-sm font-medium text-gray-900">
              {i + 1}. {s.title}
            </span>
            <span className="text-sm text-green-700 font-medium">
              {hasQuiz(s) ? `${s.bestCorrectCount ?? s.questions.length}/${s.questions.length} ✓` : "✓"}
            </span>
          </li>
        ))}
      </ul>

      {cert ? (
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-900">
            Certificate issued to {cert.fullName}
          </p>
          <p className="mt-1 text-sm text-green-800">
            Certificate no. <span className="font-mono">{cert.verifyCode}</span> · Valid
            through{" "}
            {new Date(cert.expiresAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/coaching/certificate/${cert.verifyCode}`}>
              <Button>View & print certificate</Button>
            </Link>
            <a
              href={`mailto:?subject=${encodeURIComponent("My SkyBall Coaching Certificate")}&body=${encodeURIComponent(
                `View my certificate: https://skyball.us/coaching/certificate/${cert.verifyCode}`
              )}`}
            >
              <Button variant="outline">Email it to yourself</Button>
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <label className="block text-sm font-medium text-gray-900">
            Name on certificate
          </label>
          <div className="mt-2 flex flex-col sm:flex-row gap-3">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="sm:max-w-xs"
            />
            <Button onClick={issue} disabled={issuing}>
              {issuing ? "Issuing…" : "Get my certificate"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
