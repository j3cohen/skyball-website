// lib/server/certLearnerAuth.ts
// Learner authentication for /api/certification/* routes.
//
// Main-site sessions live in localStorage (no auth cookies), so course
// pages send `Authorization: Bearer <access_token>` and we validate the
// token against the MOBILE project (where all end-user auth lives).

import "server-only";
import { getMobileSupabase } from "@/lib/server/supabaseMobile";

export type CertLearner = { userId: string; email: string | null };

export async function getCertLearner(request: Request): Promise<CertLearner | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const { data, error } = await getMobileSupabase().auth.getUser(match[1]);
  if (error || !data.user) return null;

  return { userId: data.user.id, email: data.user.email ?? null };
}

/** Full name from the mobile `profiles` table (best-effort). */
export async function getLearnerFullName(userId: string): Promise<string | null> {
  const { data } = await getMobileSupabase()
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle<{ full_name: string | null }>();
  return data?.full_name ?? null;
}
