// lib/certification/fixtures.ts
// Mock data + mock grading for the learner course shell and admin
// builder previews. Used ONLY while the real APIs are being wired —
// the course shell takes its data/handlers as props, so swapping
// fixtures for live endpoints is a one-line change in the page.

import {
  requiredCorrect,
  type CourseOutline,
  type QuizAnswer,
  type QuizSubmitResult,
} from "./types";

// Answer key lives beside the fixtures (in the real system it never
// leaves the server).
const ANSWER_KEY: Record<string, { correctIndex: number; explanation: string | null }> = {
  "q-1a": { correctIndex: 1, explanation: "The SkyBall court is 20' x 44' — the same footprint as a pickleball court." },
  "q-1b": { correctIndex: 2, explanation: "Rallies start with an underhand serve from behind the baseline." },
  "q-1c": { correctIndex: 0, explanation: null },
  "q-2a": { correctIndex: 3, explanation: "Keep the contact point out in front — it maximizes control on the light ball." },
  "q-2b": { correctIndex: 1, explanation: null },
  "q-2c": { correctIndex: 0, explanation: "Progressions should go simple → complex: cooperative rallying before competitive play." },
  "q-3a": { correctIndex: 2, explanation: "Groups of 4 per court keeps everyone hitting; rotate every 5–7 minutes." },
  "q-3b": { correctIndex: 1, explanation: null },
  "q-3c": { correctIndex: 3, explanation: "End every session with a game-based activity — it's what players remember." },
};

export const FIXTURE_COURSE: CourseOutline = {
  programTitle: "SkyBall Coaching Certification — Level 1",
  programDescription:
    "Learn the fundamentals of coaching SkyBall: rules and safety, core technique, and how to run engaging sessions for groups of any size.",
  enrollmentStatus: "in_progress",
  certificate: null,
  sections: [
    {
      id: "sec-1",
      title: "Rules, Court & Safety",
      position: 0,
      introEnabled: true,
      introTitle: "Welcome to SkyBall Coaching",
      introBody:
        "In this first section you'll learn the official rules, court dimensions, and the safety fundamentals every coach is responsible for. Watch the short video, then take a quick quiz — you need 2 of 3 correct to move on.",
      youtubeId: "dQw4w9WgXcQ",
      questions: [
        {
          id: "q-1a",
          prompt: "What are the dimensions of a SkyBall court?",
          choices: ["30' x 60'", "20' x 44'", "18' x 36'", "27' x 78'"],
        },
        {
          id: "q-1b",
          prompt: "How does a rally begin?",
          choices: [
            "Overhand serve from anywhere",
            "Drop hit from mid-court",
            "Underhand serve from behind the baseline",
            "Toss from the net player",
          ],
        },
        {
          id: "q-1c",
          prompt: "What is the coach's first responsibility at the start of every session?",
          choices: [
            "Check the court and surroundings for hazards",
            "Collect payment",
            "Start a scrimmage immediately",
            "Assign team captains",
          ],
        },
      ],
      passThresholdType: "percent",
      passThresholdValue: 66,
      retakeCooldownMinutes: 5,
      passed: false,
      attemptCount: 0,
      bestCorrectCount: null,
      cooldownUntil: null,
    },
    {
      id: "sec-2",
      title: "Core Technique & Progressions",
      position: 1,
      introEnabled: false,
      introTitle: null,
      introBody: null,
      youtubeId: "dQw4w9WgXcQ",
      questions: [
        {
          id: "q-2a",
          prompt: "Where should players make contact with the ball for maximum control?",
          choices: ["Behind the body", "Directly overhead", "At the hip", "Out in front of the body"],
        },
        {
          id: "q-2b",
          prompt: "Which grip should beginners start with?",
          choices: ["Western", "Continental", "Two-handed", "Any grip"],
        },
        {
          id: "q-2c",
          prompt: "What's the right order for skill progressions?",
          choices: [
            "Cooperative rallying, then competitive play",
            "Competitive play, then drills",
            "Serving, then footwork only",
            "Match play from day one",
          ],
        },
      ],
      passThresholdType: "percent",
      passThresholdValue: 66,
      retakeCooldownMinutes: 5,
      passed: false,
      attemptCount: 0,
      bestCorrectCount: null,
      cooldownUntil: null,
    },
    {
      id: "sec-3",
      title: "Running Great Sessions",
      position: 2,
      introEnabled: true,
      introTitle: "Coaching Groups",
      introBody:
        "The final section covers session structure: warm-ups, station rotations, group management, and how to keep every player engaged from the first minute to the last.",
      youtubeId: "dQw4w9WgXcQ",
      questions: [
        {
          id: "q-3a",
          prompt: "What's the ideal group size per court for drills?",
          choices: ["2", "8", "4", "12"],
        },
        {
          id: "q-3b",
          prompt: "How long should a warm-up last for a 60-minute session?",
          choices: ["30 minutes", "5–10 minutes", "No warm-up needed", "20 minutes"],
        },
        {
          id: "q-3c",
          prompt: "How should every session end?",
          choices: [
            "Conditioning sprints",
            "A lecture recap",
            "Silent stretching",
            "A game-based activity",
          ],
        },
      ],
      passThresholdType: "count",
      passThresholdValue: 3,
      retakeCooldownMinutes: 0,
      passed: false,
      attemptCount: 0,
      bestCorrectCount: null,
      cooldownUntil: null,
    },
  ],
};

/** Mock offers for the sales-page preview. */
export const FIXTURE_OFFERS = [
  {
    id: "offer-1",
    name: "Certification — Single",
    description: "One certification seat.",
    priceCents: 9900,
    seatCount: 1,
    equipmentItems: [] as { label: string; qty: number }[],
  },
  {
    id: "offer-2",
    name: "Club 3-Pack",
    description: "Three certification seats for your coaching staff.",
    priceCents: 24900,
    seatCount: 3,
    equipmentItems: [] as { label: string; qty: number }[],
  },
  {
    id: "offer-3",
    name: "Club Starter Combo",
    description: "Everything a club needs to launch a SkyBall program.",
    priceCents: 79900,
    seatCount: 3,
    equipmentItems: [
      { label: "SkyBall Racket", qty: 8 },
      { label: "SkyBall Official Ball", qty: 12 },
    ],
  },
];

/**
 * Mock grader — client-side stand-in for POST /quiz-submit. Enforces
 * the same cooldown semantics the API will (in memory only).
 */
export function mockGradeQuiz(
  course: CourseOutline,
  sectionId: string,
  answers: QuizAnswer[]
): QuizSubmitResult {
  const section = course.sections.find((s) => s.id === sectionId);
  if (!section) throw new Error("Unknown section");

  const results = section.questions.map((q) => {
    const key = ANSWER_KEY[q.id] ?? { correctIndex: 0, explanation: null };
    const yourChoice = answers.find((a) => a.questionId === q.id)?.choiceIndex ?? -1;
    return {
      questionId: q.id,
      yourChoice,
      correctIndex: key.correctIndex,
      correct: yourChoice === key.correctIndex,
      explanation: key.explanation,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const needed = requiredCorrect(
    section.passThresholdType,
    section.passThresholdValue,
    section.questions.length
  );
  const passed = correctCount >= needed;

  const retryAt =
    !passed && section.retakeCooldownMinutes > 0
      ? new Date(Date.now() + section.retakeCooldownMinutes * 60_000).toISOString()
      : null;

  const otherSectionsPassed = course.sections
    .filter((s) => s.id !== sectionId)
    .every((s) => s.passed);

  return {
    correctCount,
    total: section.questions.length,
    passed,
    results,
    retryAt,
    enrollmentCompleted: passed && otherSectionsPassed,
  };
}
