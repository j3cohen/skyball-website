"use client";

// Slide-over editor for one course section: intro slide (toggle +
// text), video URL with live YouTube preview, optional per-section
// threshold/cooldown overrides, and the quiz question list editor
// (add/edit/remove rows, radio marks the correct choice, optional
// explanation shown to learners after grading).
//
// One Save button persists everything: PATCH the section fields, then
// PUT the full question list (full replace).

import { useMemo, useState } from "react";
import {
  extractYouTubeId,
  type CertQuestion,
  type CertSection,
} from "@/lib/cert-utils";

type Props = {
  section: CertSection;
  onClose: () => void;
  onSaved: () => void;
};

type EditableQuestion = CertQuestion;

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

export default function CertSectionPanel({ section, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(section.title);
  const [introEnabled, setIntroEnabled] = useState(section.intro_enabled);
  const [introTitle, setIntroTitle] = useState(section.intro_title ?? "");
  const [introBody, setIntroBody] = useState(section.intro_body ?? "");
  const [videoUrl, setVideoUrl] = useState(section.video_url ?? "");
  const [override, setOverride] = useState(
    section.pass_threshold_type !== null ||
      section.pass_threshold_value !== null ||
      section.retake_cooldown_minutes !== null
  );
  const [thresholdType, setThresholdType] = useState<"percent" | "count">(
    section.pass_threshold_type ?? "percent"
  );
  const [thresholdValue, setThresholdValue] = useState(
    String(section.pass_threshold_value ?? 80)
  );
  const [cooldown, setCooldown] = useState(String(section.retake_cooldown_minutes ?? 0));
  const [questions, setQuestions] = useState<EditableQuestion[]>(
    section.cert_questions.map((q) => ({
      prompt: q.prompt,
      choices: [...q.choices],
      correct_index: q.correct_index,
      explanation: q.explanation,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const youtubeId = useMemo(() => extractYouTubeId(videoUrl), [videoUrl]);

  function updateQuestion(i: number, patch: Partial<EditableQuestion>) {
    setQuestions((prev) => prev.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  }

  async function save() {
    if (!title.trim()) return setError("Section title is required.");
    if (videoUrl.trim() && !youtubeId) {
      return setError("The video URL doesn't look like a YouTube link.");
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) return setError(`Question ${i + 1} needs a prompt.`);
      const filled = q.choices.filter((c) => c.trim());
      if (filled.length < 2) return setError(`Question ${i + 1} needs at least 2 choices.`);
      if (!q.choices[q.correct_index]?.trim()) {
        return setError(`Question ${i + 1}: mark a non-empty choice as correct.`);
      }
    }

    setSaving(true);
    setError(null);
    try {
      const sectionPayload = {
        title: title.trim(),
        intro_enabled: introEnabled,
        intro_title: introTitle.trim() || null,
        intro_body: introBody.trim() || null,
        video_url: videoUrl.trim() || null,
        pass_threshold_type: override ? thresholdType : null,
        pass_threshold_value: override ? Number.parseInt(thresholdValue, 10) || 0 : null,
        retake_cooldown_minutes: override ? Number.parseInt(cooldown, 10) || 0 : null,
      };
      const secRes = await fetch(`/api/admin/certification/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sectionPayload),
      });
      const secJson = await secRes.json();
      if (!secRes.ok) throw new Error(secJson.error ?? "Failed to save section.");

      // Drop empty choice slots, remap correct_index accordingly.
      const cleanQuestions = questions.map((q) => {
        const kept: string[] = [];
        let correct = 0;
        q.choices.forEach((c, i) => {
          if (c.trim()) {
            if (i === q.correct_index) correct = kept.length;
            kept.push(c.trim());
          }
        });
        return {
          prompt: q.prompt.trim(),
          choices: kept,
          correct_index: correct,
          explanation: q.explanation?.trim() || null,
        };
      });
      const qRes = await fetch(
        `/api/admin/certification/sections/${section.id}/questions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: cleanQuestions }),
        }
      );
      const qJson = await qRes.json();
      if (!qRes.ok) throw new Error(qJson.error ?? "Failed to save questions.");

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 truncate">Edit section</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>

          {/* Intro slide */}
          <div className="rounded-xl border border-gray-200 p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-gray-900">Intro slide</span>
              <input
                type="checkbox"
                checked={introEnabled}
                onChange={(e) => setIntroEnabled(e.target.checked)}
                className="h-4 w-4 accent-sky-600"
              />
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              A text slide shown before the video: section title + a quick overview of what
              they&apos;ll learn.
            </p>
            {introEnabled && (
              <div className="mt-3 space-y-3">
                <input
                  value={introTitle}
                  onChange={(e) => setIntroTitle(e.target.value)}
                  placeholder="Slide title"
                  className={inputCls}
                />
                <textarea
                  value={introBody}
                  onChange={(e) => setIntroBody(e.target.value)}
                  placeholder="What will they learn in this section?"
                  rows={3}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Video */}
          <div className="rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-semibold text-gray-900">Video</label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste a YouTube link (unlisted is fine)"
              className={`${inputCls} mt-2`}
            />
            {videoUrl.trim() && !youtubeId && (
              <p className="mt-1 text-xs text-red-600">Not a recognizable YouTube URL.</p>
            )}
            {youtubeId && (
              <div
                className="relative mt-3 w-full overflow-hidden rounded-lg bg-black"
                style={{ paddingTop: "56.25%" }}
              >
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                  title="Video preview"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {/* Pass rules override */}
          <div className="rounded-xl border border-gray-200 p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-gray-900">
                Override program pass rules
              </span>
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => setOverride(e.target.checked)}
                className="h-4 w-4 accent-sky-600"
              />
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              Off = this section uses the program defaults.
            </p>
            {override && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Threshold type
                  </label>
                  <select
                    value={thresholdType}
                    onChange={(e) => setThresholdType(e.target.value as "percent" | "count")}
                    className={inputCls}
                  >
                    <option value="percent">% correct</option>
                    <option value="count"># correct</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {thresholdType === "percent" ? "Percent to pass" : "Correct to pass"}
                  </label>
                  <input
                    value={thresholdValue}
                    inputMode="numeric"
                    onChange={(e) => setThresholdValue(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Retake wait (min)
                  </label>
                  <input
                    value={cooldown}
                    inputMode="numeric"
                    onChange={(e) => setCooldown(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Quiz questions ({questions.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setQuestions((prev) => [
                    ...prev,
                    { prompt: "", choices: ["", "", "", ""], correct_index: 0, explanation: null },
                  ])
                }
                className="text-sm font-medium text-sky-700 hover:text-sky-900"
              >
                + Add question
              </button>
            </div>
            <div className="mt-3 space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Question {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => prev.filter((_, j) => j !== i))}
                      className="text-xs font-medium text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(i, { prompt: e.target.value })}
                    placeholder="Question prompt"
                    rows={2}
                    className={`${inputCls} mt-2`}
                  />
                  <p className="mt-3 text-xs text-gray-500">
                    Choices — select the radio next to the correct answer.
                  </p>
                  <div className="mt-1 space-y-2">
                    {q.choices.map((choice, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${i}`}
                          checked={q.correct_index === ci}
                          onChange={() => updateQuestion(i, { correct_index: ci })}
                          className="h-4 w-4 accent-sky-600"
                          aria-label={`Mark choice ${ci + 1} correct`}
                        />
                        <input
                          value={choice}
                          onChange={(e) =>
                            updateQuestion(i, {
                              choices: q.choices.map((c, j) => (j === ci ? e.target.value : c)),
                            })
                          }
                          placeholder={`Choice ${ci + 1}`}
                          className={inputCls}
                        />
                        {q.choices.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateQuestion(i, {
                                choices: q.choices.filter((_, j) => j !== ci),
                                correct_index:
                                  q.correct_index === ci
                                    ? 0
                                    : q.correct_index > ci
                                      ? q.correct_index - 1
                                      : q.correct_index,
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Remove choice"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.choices.length < 6 && (
                    <button
                      type="button"
                      onClick={() => updateQuestion(i, { choices: [...q.choices, ""] })}
                      className="mt-2 text-xs font-medium text-sky-700 hover:text-sky-900"
                    >
                      + Add choice
                    </button>
                  )}
                  <textarea
                    value={q.explanation ?? ""}
                    onChange={(e) =>
                      updateQuestion(i, { explanation: e.target.value || null })
                    }
                    placeholder="Optional explanation (shown to learners after grading)"
                    rows={2}
                    className={`${inputCls} mt-3`}
                  />
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-gray-500 rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center">
                  No questions yet. Sections without questions auto-pass after the video.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
          {error ? (
            <p className="text-sm text-red-600 truncate">{error}</p>
          ) : (
            <span />
          )}
          <div className="flex gap-3 shrink-0">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save section"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
