// GET /api/admin/certification/purchases — purchases with seats
// (claim links are built client-side from claim_token)

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import { guardCertAdmin } from "@/lib/server/certGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { data, error } = await certDb
    .from("cert_purchases")
    .select(
      "id, program_id, offer_id, stripe_session_id, purchaser_email, purchaser_name, " +
        "seat_count, amount_total_cents, currency, created_at, " +
        "cert_programs(title), cert_offers(name), " +
        "cert_seats(id, claim_token, status, claimed_email, claimed_name, claimed_at)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("cert purchases list error:", error);
    return NextResponse.json({ error: "Failed to fetch purchases." }, { status: 500 });
  }

  return NextResponse.json({ purchases: data ?? [] });
}
