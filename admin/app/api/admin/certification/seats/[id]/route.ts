// PATCH /api/admin/certification/seats/[id] — revoke / restore a seat
// Body: { status: "revoked" | "unclaimed" }
//
// Revoking an unclaimed seat kills its claim link. Revoking a claimed
// seat also cuts course access (the learner course route checks the
// seat's status). Restore only returns a seat to 'unclaimed' if it was
// never claimed — claimed seats can only be revoked/left alone.

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import { badRequest, guardCertAdmin, readJson } from "@/lib/server/certGuard";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const { status } = (body ?? {}) as { status?: unknown };

  if (status !== "revoked" && status !== "unclaimed") {
    return badRequest("status must be 'revoked' or 'unclaimed'.");
  }

  const { data: seat } = await certDb
    .from("cert_seats")
    .select("id, status, claimed_by_user_id")
    .eq("id", params.id)
    .single();
  if (!seat) return NextResponse.json({ error: "Seat not found." }, { status: 404 });

  if (status === "unclaimed" && seat.claimed_by_user_id) {
    return badRequest("Cannot un-claim a seat that was already claimed.");
  }

  const { data, error } = await certDb
    .from("cert_seats")
    .update({ status })
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    console.error("cert seat update error:", error);
    return NextResponse.json({ error: "Failed to update seat." }, { status: 500 });
  }

  return NextResponse.json({ seat: data });
}
