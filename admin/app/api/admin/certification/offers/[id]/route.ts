// PATCH  /api/admin/certification/offers/[id] — update an offer
// DELETE /api/admin/certification/offers/[id] — delete (blocked once
//        purchases reference it — deactivate instead)

import { NextResponse } from "next/server";
import { certDb } from "@/lib/server/certDb";
import {
  badRequest,
  equipmentItems,
  guardCertAdmin,
  intInRange,
  optionalString,
  readJson,
  requiredString,
} from "@/lib/server/certGuard";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const b = (body ?? {}) as Record<string, unknown>;

  const update: Record<string, unknown> = {};

  if (b.name !== undefined) {
    const v = requiredString(b.name, 200);
    if (!v) return badRequest("name cannot be empty.");
    update.name = v;
  }
  if (b.description !== undefined) {
    update.description = optionalString(b.description, 2000) ?? null;
  }
  if (b.price_cents !== undefined) {
    const v = intInRange(b.price_cents, 1, 10_000_000);
    if (v === null) return badRequest("price_cents must be a positive integer.");
    update.price_cents = v;
  }
  if (b.seat_count !== undefined) {
    const v = intInRange(b.seat_count, 1, 1000);
    if (v === null) return badRequest("seat_count must be 1–1000.");
    update.seat_count = v;
  }
  if (b.equipment_items !== undefined) {
    const v = equipmentItems(b.equipment_items);
    if (v === null) return badRequest("equipment_items must be [{label, qty}] lines.");
    update.equipment_items = v;
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") return badRequest("active must be boolean.");
    update.active = b.active;
  }
  if (b.position !== undefined) {
    const v = intInRange(b.position, 0, 10_000);
    if (v === null) return badRequest("position must be a non-negative integer.");
    update.position = v;
  }

  if (Object.keys(update).length === 0) return badRequest("Nothing to update.");

  const { data, error } = await certDb
    .from("cert_offers")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    console.error("cert offer update error:", error);
    return NextResponse.json({ error: "Failed to update offer." }, { status: 500 });
  }

  return NextResponse.json({ offer: data });
}

export async function DELETE(_req: Request, { params }: Params) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const { error } = await certDb.from("cert_offers").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "Cannot delete an offer with purchases. Deactivate it instead." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
