// app/api/certification/certificate/route.ts
// POST { fullName } — issue the certificate once every section is passed
// (idempotent: one certificate per enrollment). Completion is derived from
// attempts, never read off enrollment.status — see the note in POST.
// GET — fetch the learner's own certificate.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getCertLearner } from "@/lib/server/certLearnerAuth";
import {
  allSectionsPassed,
  findActiveEnrollment,
  loadAttempts,
  loadProgramContent,
} from "@/lib/server/certCourse";
import { generateVerifyCode } from "@/lib/server/certCodes";
import { rateLimitResponse } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

type CertRow = {
  verify_code: string;
  full_name: string;
  issued_at: string;
  expires_at: string;
  status: string;
};

function toResponse(cert: CertRow) {
  return {
    verifyCode: cert.verify_code,
    fullName: cert.full_name,
    issuedAt: cert.issued_at,
    expiresAt: cert.expires_at,
  };
}

export async function GET(request: Request) {
  const limited = rateLimitResponse(request, "cert-certificate", 30);
  if (limited) return limited;
  const learner = await getCertLearner(request);
  if (!learner) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const enrollment = await findActiveEnrollment(learner.userId);
  if (!enrollment) return NextResponse.json({ error: "No enrollment found." }, { status: 404 });

  const { data: cert } = await supabaseAdmin
    .from("cert_certifications")
    .select("verify_code, full_name, issued_at, expires_at, status")
    .eq("enrollment_id", enrollment.id)
    .maybeSingle<CertRow>();

  if (!cert || cert.status !== "active") {
    return NextResponse.json({ error: "No certificate issued." }, { status: 404 });
  }
  return NextResponse.json({ certificate: toResponse(cert) });
}

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "cert-certificate", 30);
  if (limited) return limited;
  try {
    const learner = await getCertLearner(request);
    if (!learner) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

    const { fullName } = (await request.json().catch(() => ({}))) as { fullName?: string };
    const cleanName = typeof fullName === "string" ? fullName.trim().slice(0, 120) : "";
    if (!cleanName) {
      return NextResponse.json({ error: "Enter the name for your certificate." }, { status: 400 });
    }

    const enrollment = await findActiveEnrollment(learner.userId);
    if (!enrollment) {
      return NextResponse.json({ error: "No enrollment found." }, { status: 404 });
    }

    // Idempotent: return the existing certificate if one was issued.
    const { data: existing } = await supabaseAdmin
      .from("cert_certifications")
      .select("verify_code, full_name, issued_at, expires_at, status")
      .eq("enrollment_id", enrollment.id)
      .maybeSingle<CertRow>();
    if (existing) return NextResponse.json({ certificate: toResponse(existing) });

    const content = await loadProgramContent(enrollment.program_id);
    if (!content) {
      return NextResponse.json({ error: "Course content unavailable." }, { status: 500 });
    }

    // Completion is DERIVED from attempts, not read off enrollment.status.
    // quiz-submit is the only writer of that column, so a program whose
    // sections have no questions (all auto-pass) would never flip it and the
    // learner could never claim a certificate.
    const attempts = await loadAttempts(enrollment.id);
    if (!allSectionsPassed(content.sections, content.questions, attempts)) {
      return NextResponse.json(
        { error: "Finish every section before claiming your certificate." },
        { status: 400 }
      );
    }
    if (enrollment.status !== "completed") {
      await supabaseAdmin
        .from("cert_enrollments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", enrollment.id);
    }

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt);
    expiresAt.setMonth(expiresAt.getMonth() + content.program.expiry_months);

    // Retry on verify_code collision; 23505 on enrollment_id means a
    // concurrent issue won — return theirs.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabaseAdmin
        .from("cert_certifications")
        .insert({
          verify_code: generateVerifyCode(),
          enrollment_id: enrollment.id,
          program_id: enrollment.program_id,
          user_id: learner.userId,
          full_name: cleanName,
          email: learner.email ?? "",
          issued_at: issuedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select("verify_code, full_name, issued_at, expires_at, status")
        .single<CertRow>();

      if (data) return NextResponse.json({ certificate: toResponse(data) });
      if (error?.code === "23505") {
        const { data: raced } = await supabaseAdmin
          .from("cert_certifications")
          .select("verify_code, full_name, issued_at, expires_at, status")
          .eq("enrollment_id", enrollment.id)
          .maybeSingle<CertRow>();
        if (raced) return NextResponse.json({ certificate: toResponse(raced) });
        continue; // verify_code collision — regenerate
      }
      console.error("cert insert failed:", error);
      break;
    }

    return NextResponse.json({ error: "Could not issue the certificate." }, { status: 500 });
  } catch (err) {
    console.error("⚠️ /api/certification/certificate error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
