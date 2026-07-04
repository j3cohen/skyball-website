// POST /api/account-exists  { email }  ->  { exists: boolean }
// Checks whether an email already has an account on the mobile project, so the
// registration form can steer account holders to log in instead of registering
// as a guest. Fails open (exists:false) so a check failure never blocks signup.
import { NextResponse } from "next/server";
import { getMobileSupabase } from "@/lib/server/supabaseMobile";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email || typeof email !== "string") {
      return NextResponse.json({ exists: false });
    }
    const target = email.trim().toLowerCase();
    if (!target) return NextResponse.json({ exists: false });

    const admin = getMobileSupabase().auth.admin;
    const perPage = 200;

    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.listUsers({ page, perPage });
      if (error) {
        console.error("account-exists listUsers error:", error.message);
        return NextResponse.json({ exists: false });
      }
      const users = data?.users ?? [];
      if (users.some((u) => (u.email ?? "").toLowerCase() === target)) {
        return NextResponse.json({ exists: true });
      }
      if (users.length < perPage) break;
    }

    return NextResponse.json({ exists: false });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
