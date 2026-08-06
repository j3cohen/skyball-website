// app/api/certification/course/route.ts
// GET — the learner's course outline. Bearer-authenticated; returns
// sections, sanitized questions (NO correct answers), per-section pass
// state, cooldowns, and the certificate if issued.

import { NextResponse } from "next/server";
import { getCertLearner, getLearnerFullName } from "@/lib/server/certLearnerAuth";
import { buildCourseOutline, findActiveEnrollment } from "@/lib/server/certCourse";
import { rateLimitResponse } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = rateLimitResponse(request, "cert-course", 60);
  if (limited) return limited;
  try {
    const learner = await getCertLearner(request);
    if (!learner) {
      return NextResponse.json({ error: "Sign in to access the course." }, { status: 401 });
    }

    const enrollment = await findActiveEnrollment(learner.userId);
    if (!enrollment) {
      return NextResponse.json(
        { error: "No enrollment found. Claim a seat first." },
        { status: 404 }
      );
    }

    const course = await buildCourseOutline(enrollment);
    if (!course) {
      return NextResponse.json({ error: "Course content unavailable." }, { status: 500 });
    }

    const fullName = await getLearnerFullName(learner.userId);

    return NextResponse.json({ course, defaultFullName: fullName ?? "" });
  } catch (err) {
    console.error("⚠️ /api/certification/course error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
