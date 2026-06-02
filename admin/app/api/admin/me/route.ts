// GET /api/admin/me
// Returns 200 if the caller is an authenticated admin, 401/403 otherwise.
// Used by the login page to verify admin status before redirecting.

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();

  if (!session) {
    return NextResponse.json({ error: "not-authorized" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
