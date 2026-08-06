// app/coaching/course/page.tsx
// The certification course experience (Bearer-authenticated).
// `?demo=1` renders the fixture course with client-side grading so the
// full click-through flow can be previewed without an account or a
// purchase (content is fake — nothing is stored).

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import CourseShell from "@/components/certification/course-shell";
import { FIXTURE_COURSE, mockGradeQuiz } from "@/lib/certification/fixtures";
import { certFetch, CertApiError } from "@/lib/certification/client";
import type { CourseCertificate, CourseOutline } from "@/lib/certification/types";
import { supabase } from "@/lib/supabaseClient";

type LoadState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "no-enrollment" }
  | { kind: "error"; message: string }
  | { kind: "ready"; course: CourseOutline; defaultFullName: string };

export default function CoachingCoursePage({
  searchParams,
}: {
  searchParams: { demo?: string };
}) {
  const demo = searchParams?.demo === "1";
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    if (demo) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setState({ kind: "signed-out" });
      return;
    }
    try {
      const json = await certFetch<{ course: CourseOutline; defaultFullName: string }>(
        "/api/certification/course"
      );
      setState({ kind: "ready", course: json.course, defaultFullName: json.defaultFullName });
    } catch (e) {
      if (e instanceof CertApiError && e.status === 401) setState({ kind: "signed-out" });
      else if (e instanceof CertApiError && e.status === 404)
        setState({ kind: "no-enrollment" });
      else
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Could not load your course.",
        });
    }
  }, [demo]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = demo
    ? FIXTURE_COURSE.programTitle
    : state.kind === "ready"
      ? state.course.programTitle
      : "Coaching Certification";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            SkyBall Coaching Certification{demo ? " · demo preview" : ""}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{title}</h1>

          {demo && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Sample preview.</span> Example content only —
                nothing here is saved and no certificate is issued.
              </p>
              <Link href="/coaching">
                <Button size="sm">Get certified</Button>
              </Link>
            </div>
          )}

          <div className="mt-8">
            {demo ? (
              <CourseShell
                course={FIXTURE_COURSE}
                defaultFullName=""
                onSubmitQuiz={async (sectionId, answers) => {
                  await new Promise((r) => setTimeout(r, 400));
                  return mockGradeQuiz(FIXTURE_COURSE, sectionId, answers);
                }}
                onIssueCertificate={async (fullName): Promise<CourseCertificate> => {
                  await new Promise((r) => setTimeout(r, 400));
                  const issuedAt = new Date();
                  const expiresAt = new Date(issuedAt);
                  expiresAt.setMonth(expiresAt.getMonth() + 24);
                  // "preview" resolves to the sample certificate page —
                  // a fake code would 404 against the real lookup.
                  return {
                    verifyCode: "preview",
                    fullName,
                    issuedAt: issuedAt.toISOString(),
                    expiresAt: expiresAt.toISOString(),
                  };
                }}
              />
            ) : state.kind === "loading" ? (
              <div className="bg-white rounded-xl shadow p-8">
                <p className="text-gray-600">Loading your course…</p>
              </div>
            ) : state.kind === "signed-out" ? (
              <div className="bg-white rounded-xl shadow p-8">
                <h2 className="text-xl font-semibold text-gray-900">Sign in to continue</h2>
                <p className="mt-2 text-gray-600">
                  Your course progress is tied to your SkyBall account.
                </p>
                <div className="mt-5">
                  <Link href={`/login?from=${encodeURIComponent("/coaching/course")}`}>
                    <Button>Sign in</Button>
                  </Link>
                </div>
              </div>
            ) : state.kind === "no-enrollment" ? (
              <div className="bg-white rounded-xl shadow p-8">
                <h2 className="text-xl font-semibold text-gray-900">No course found</h2>
                <p className="mt-2 text-gray-600">
                  You&apos;re signed in but haven&apos;t claimed a certification seat yet. Open
                  your seat link to claim it, or purchase a certification below.
                </p>
                <div className="mt-5">
                  <Link href="/coaching">
                    <Button>View certification</Button>
                  </Link>
                </div>
              </div>
            ) : state.kind === "error" ? (
              <div className="bg-white rounded-xl shadow p-8">
                <p className="text-red-600">{state.message}</p>
                <div className="mt-4">
                  <Button variant="outline" onClick={() => void load()}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <CourseShell
                key={state.course.sections.map((s) => s.id).join(",")}
                course={state.course}
                defaultFullName={state.defaultFullName}
                onSubmitQuiz={(sectionId, answers) =>
                  certFetch("/api/certification/quiz-submit", {
                    method: "POST",
                    body: { sectionId, answers },
                  })
                }
                onIssueCertificate={async (fullName) => {
                  const json = await certFetch<{ certificate: CourseCertificate }>(
                    "/api/certification/certificate",
                    { method: "POST", body: { fullName } }
                  );
                  return json.certificate;
                }}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
