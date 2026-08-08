// Unit tests for pure certification logic — no services required.

import { describe, expect, it } from "vitest";
import {
  extractYouTubeId,
  hasQuiz,
  requiredCorrect,
  stepsFor,
} from "@/lib/certification/types";
import { cooldownUntil, type AttemptRow } from "@/lib/server/certCourse";
import { generateClaimToken, generateVerifyCode } from "@/lib/server/certCodes";
import { FIXTURE_COURSE, mockGradeQuiz } from "@/lib/certification/fixtures";

describe("extractYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?list=abc&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"], // bare id
    ["  https://youtu.be/dQw4w9WgXcQ  ", "dQw4w9WgXcQ"], // whitespace
  ])("extracts from %s", (input, expected) => {
    expect(extractYouTubeId(input)).toBe(expected);
  });

  it.each([["https://vimeo.com/12345"], ["not a url"], [""], ["https://youtube.com/watch?v=short"]])(
    "rejects %s",
    (input) => {
      expect(extractYouTubeId(input)).toBeNull();
    }
  );
});

describe("requiredCorrect", () => {
  it("percent thresholds round up", () => {
    expect(requiredCorrect("percent", 66, 3)).toBe(2); // 1.98 → 2
    expect(requiredCorrect("percent", 80, 5)).toBe(4);
    expect(requiredCorrect("percent", 100, 3)).toBe(3);
    expect(requiredCorrect("percent", 1, 3)).toBe(1);
    expect(requiredCorrect("percent", 0, 3)).toBe(0);
  });
  it("count thresholds clamp to question count", () => {
    expect(requiredCorrect("count", 3, 3)).toBe(3);
    expect(requiredCorrect("count", 10, 3)).toBe(3);
    expect(requiredCorrect("count", 2, 5)).toBe(2);
  });
  it("zero questions never requires correct answers", () => {
    expect(requiredCorrect("percent", 80, 0)).toBe(0);
    expect(requiredCorrect("count", 3, 0)).toBe(0);
  });
});

function attempt(overrides: Partial<AttemptRow>): AttemptRow {
  return {
    id: "a",
    section_id: "s",
    attempt_number: 1,
    correct_count: 0,
    question_count: 3,
    passed: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("cooldownUntil", () => {
  it("null when no cooldown configured", () => {
    expect(cooldownUntil([attempt({})], 0)).toBeNull();
  });
  it("null when no attempts", () => {
    expect(cooldownUntil([], 10)).toBeNull();
  });
  it("null once a passing attempt exists", () => {
    expect(cooldownUntil([attempt({ passed: true })], 10)).toBeNull();
  });
  it("future timestamp after a fresh failed attempt", () => {
    const until = cooldownUntil([attempt({})], 10);
    expect(until).not.toBeNull();
    expect(new Date(until!).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(until!).getTime()).toBeLessThanOrEqual(Date.now() + 10 * 60_000 + 1000);
  });
  it("null when the cooldown has elapsed", () => {
    const old = attempt({ created_at: new Date(Date.now() - 11 * 60_000).toISOString() });
    expect(cooldownUntil([old], 10)).toBeNull();
  });
});

describe("code generation", () => {
  it("verify codes match SB-XXXX-XXXX with unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateVerifyCode()).toMatch(/^SB-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });
  it("claim tokens are long, url-safe, and unique", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateClaimToken));
    expect(tokens.size).toBe(100);
    for (const t of tokens) expect(t).toMatch(/^[\w-]{32}$/);
  });
});

describe("mockGradeQuiz (fixture consistency)", () => {
  // The fixture course is three video-only sections then one standalone
  // quiz section, so the only gradable section is the last one.
  const section = FIXTURE_COURSE.sections[FIXTURE_COURSE.sections.length - 1];
  // Answer key from fixtures: 1a→1 1b→2 1c→0 2a→3 2b→1 2c→0 3a→2 3b→1 3c→3
  const perfect = [
    { questionId: "q-1a", choiceIndex: 1 },
    { questionId: "q-1b", choiceIndex: 2 },
    { questionId: "q-1c", choiceIndex: 0 },
    { questionId: "q-2a", choiceIndex: 3 },
    { questionId: "q-2b", choiceIndex: 1 },
    { questionId: "q-2c", choiceIndex: 0 },
    { questionId: "q-3a", choiceIndex: 2 },
    { questionId: "q-3b", choiceIndex: 1 },
    { questionId: "q-3c", choiceIndex: 3 },
  ];

  it("grades a perfect run as passed", () => {
    const result = mockGradeQuiz(FIXTURE_COURSE, section.id, perfect);
    expect(result.passed).toBe(true);
    expect(result.correctCount).toBe(9);
    expect(result.retryAt).toBeNull();
  });

  it("completes the enrollment — the video-only sections already auto-pass", () => {
    const result = mockGradeQuiz(FIXTURE_COURSE, section.id, perfect);
    expect(result.enrollmentCompleted).toBe(true);
  });

  it("fails below the threshold and sets retryAt when cooldown > 0", () => {
    const allWrong = perfect.map((a) => ({
      ...a,
      choiceIndex: a.choiceIndex === 0 ? 1 : 0,
    }));
    const result = mockGradeQuiz(FIXTURE_COURSE, section.id, allWrong);
    expect(result.passed).toBe(false);
    expect(result.correctCount).toBe(0);
    expect(result.retryAt).not.toBeNull();
    // Full reveal: every result carries the correct index.
    for (const r of result.results) expect(r.correctIndex).toBeGreaterThanOrEqual(0);
  });
});

describe("stepsFor", () => {
  const base = { introEnabled: false, youtubeId: null as string | null, questions: [] as unknown[] };
  const q = [{ id: "q1" }];

  it("returns the steps a section actually has, in learner order", () => {
    expect(stepsFor({ ...base, introEnabled: true, youtubeId: "abc", questions: q })).toEqual([
      "intro",
      "video",
      "quiz",
    ]);
  });

  it("handles a video-only section", () => {
    expect(stepsFor({ ...base, youtubeId: "abc" })).toEqual(["video"]);
  });

  it("handles a standalone quiz section", () => {
    expect(stepsFor({ ...base, questions: q })).toEqual(["quiz"]);
  });

  it("handles an intro + quiz section with no video", () => {
    expect(stepsFor({ ...base, introEnabled: true, questions: q })).toEqual(["intro", "quiz"]);
  });

  it("handles intro + video with no quiz", () => {
    expect(stepsFor({ ...base, introEnabled: true, youtubeId: "abc" })).toEqual([
      "intro",
      "video",
    ]);
  });

  it("returns an empty list for a section with no content", () => {
    expect(stepsFor(base)).toEqual([]);
  });

  it("agrees with hasQuiz", () => {
    expect(hasQuiz({ questions: q })).toBe(true);
    expect(hasQuiz({ questions: [] })).toBe(false);
  });
});
