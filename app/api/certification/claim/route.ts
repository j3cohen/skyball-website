// app/api/certification/claim/route.ts
// POST { token } — redeem a seat claim link. Requires a signed-in
// SkyBall account (Bearer token): the certification is tied to a real
// identity. One active enrollment per user+program; re-certification
// is allowed once a prior certificate has expired.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { getCertLearner, getLearnerFullName } from "@/lib/server/certLearnerAuth";
import { rateLimitResponse } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "cert-claim", 10);
  if (limited) return limited;
  try {
    const learner = await getCertLearner(request);
    if (!learner) {
      return NextResponse.json({ error: "Sign in to claim your seat." }, { status: 401 });
    }

    const { token } = (await request.json().catch(() => ({}))) as { token?: string };
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing claim token." }, { status: 400 });
    }

    const { data: seat } = await supabaseAdmin
      .from("cert_seats")
      .select("id, program_id, status")
      .eq("claim_token", token)
      .maybeSingle<{ id: string; program_id: string; status: string }>();

    if (!seat) {
      return NextResponse.json({ error: "This claim link is not valid." }, { status: 404 });
    }
    if (seat.status === "revoked") {
      return NextResponse.json({ error: "This seat has been revoked." }, { status: 410 });
    }
    if (seat.status === "claimed") {
      return NextResponse.json(
        { error: "This seat has already been claimed." },
        { status: 409 }
      );
    }

    const { data: program } = await supabaseAdmin
      .from("cert_programs")
      .select("id, title, status")
      .eq("id", seat.program_id)
      .single<{ id: string; title: string; status: string }>();
    if (!program || program.status !== "published") {
      return NextResponse.json(
        { error: "This certification program is not currently open." },
        { status: 400 }
      );
    }

    // One active enrollment / unexpired certification per user+program.
    const { data: priorEnrollments } = await supabaseAdmin
      .from("cert_enrollments")
      .select("id, status, seat_id")
      .eq("user_id", learner.userId)
      .eq("program_id", seat.program_id);

    for (const prior of (priorEnrollments ?? []) as {
      id: string;
      status: string;
      seat_id: string;
    }[]) {
      // Ignore enrollments whose seat was revoked.
      const { data: priorSeat } = await supabaseAdmin
        .from("cert_seats")
        .select("status")
        .eq("id", prior.seat_id)
        .single<{ status: string }>();
      if (priorSeat?.status === "revoked") continue;

      if (prior.status === "in_progress") {
        return NextResponse.json(
          { error: "You already have access to this course — head to the course page." },
          { status: 409 }
        );
      }
      // Completed: only block if the certification is still valid.
      const { data: cert } = await supabaseAdmin
        .from("cert_certifications")
        .select("expires_at, status")
        .eq("enrollment_id", prior.id)
        .maybeSingle<{ expires_at: string; status: string }>();
      if (
        cert &&
        cert.status === "active" &&
        new Date(cert.expires_at).getTime() > Date.now()
      ) {
        return NextResponse.json(
          { error: "You already hold a valid certification for this program." },
          { status: 409 }
        );
      }
    }

    const fullName = await getLearnerFullName(learner.userId);

    // Conditional update guards the race: only one caller can flip
    // status from 'unclaimed'.
    const { data: claimed } = await supabaseAdmin
      .from("cert_seats")
      .update({
        status: "claimed",
        claimed_by_user_id: learner.userId,
        claimed_email: learner.email,
        claimed_name: fullName,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", seat.id)
      .eq("status", "unclaimed")
      .select("id")
      .maybeSingle<{ id: string }>();

    if (!claimed) {
      return NextResponse.json(
        { error: "This seat has already been claimed." },
        { status: 409 }
      );
    }

    const { error: enrollErr } = await supabaseAdmin.from("cert_enrollments").insert({
      seat_id: seat.id,
      program_id: seat.program_id,
      user_id: learner.userId,
    });
    if (enrollErr) {
      console.error("cert enrollment insert failed:", enrollErr);
      return NextResponse.json({ error: "Could not start your enrollment." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, programTitle: program.title });
  } catch (err) {
    console.error("⚠️ /api/certification/claim error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
