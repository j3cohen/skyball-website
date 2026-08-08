// app/api/certification/verify/route.ts
// GET ?code=SB-XXXX-XXXX — public certificate verification.
// Returns minimal data: name, program, dates, validity. No user ids,
// no emails.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabaseAdmin";
import { rateLimitResponse } from "@/lib/server/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Also throttles verify-code enumeration (~40-bit codes).
  const limited = rateLimitResponse(request, "cert-verify", 60);
  if (limited) return limited;
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "Missing code." }, { status: 400 });

  const { data: cert } = await supabaseAdmin
    .from("cert_certifications")
    .select("verify_code, program_id, full_name, issued_at, expires_at, status")
    .eq("verify_code", code)
    .maybeSingle<{
      verify_code: string;
      program_id: string;
      full_name: string;
      issued_at: string;
      expires_at: string;
      status: string;
    }>();

  if (!cert) {
    return NextResponse.json({ valid: false, reason: "not_found" });
  }

  const { data: program } = await supabaseAdmin
    .from("cert_programs")
    .select("title")
    .eq("id", cert.program_id)
    .single<{ title: string }>();

  const expired = new Date(cert.expires_at).getTime() < Date.now();
  const revoked = cert.status === "revoked";

  return NextResponse.json({
    valid: !expired && !revoked,
    reason: revoked ? "revoked" : expired ? "expired" : null,
    verifyCode: cert.verify_code,
    fullName: cert.full_name,
    programTitle: program?.title ?? "SkyBall Certification",
    issuedAt: cert.issued_at,
    expiresAt: cert.expires_at,
  });
}
