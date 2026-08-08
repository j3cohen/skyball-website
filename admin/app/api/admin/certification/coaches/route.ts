// GET /api/admin/certification/coaches — the certified-coaches registry
// Optional ?status=active|expired|revoked filter (expiry is derived).

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import { guardCertAdmin } from "@/lib/server/certGuard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  const { data, error } = await certDb
    .from("cert_certifications")
    .select(
      "id, verify_code, program_id, user_id, full_name, email, issued_at, expires_at, status, " +
        "cert_programs(title)"
    )
    .order("issued_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.error("cert coaches list error:", error);
    return NextResponse.json({ error: "Failed to fetch certifications." }, { status: 500 });
  }

  const now = Date.now();
  // Cast: the select string's embedded relation defeats PostgREST's
  // string-parser types on the untyped client.
  const rows = (data ?? []) as unknown as {
    id: string;
    status: string;
    expires_at: string;
    [key: string]: unknown;
  }[];
  const coaches = rows
    .map((c) => ({
      ...c,
      derived_status:
        c.status === "revoked"
          ? "revoked"
          : new Date(c.expires_at).getTime() < now
            ? "expired"
            : "active",
    }))
    .filter((c) =>
      statusFilter === "active" || statusFilter === "expired" || statusFilter === "revoked"
        ? c.derived_status === statusFilter
        : true
    );

  return NextResponse.json({ coaches });
}
