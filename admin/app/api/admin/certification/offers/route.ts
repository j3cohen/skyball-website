// POST /api/admin/certification/offers — create an offer for a program

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

export async function POST(req: Request) {
  const guard = await guardCertAdmin();
  if (guard.response) return guard.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid JSON.");
  const b = (body ?? {}) as Record<string, unknown>;

  const programId = requiredString(b.program_id, 100);
  const name = requiredString(b.name, 200);
  const priceCents = intInRange(b.price_cents, 1, 10_000_000);
  const seatCount = intInRange(b.seat_count, 1, 1000);
  const equipment = equipmentItems(b.equipment_items ?? []);

  if (!programId) return badRequest("program_id is required.");
  if (!name) return badRequest("name is required.");
  if (priceCents === null) return badRequest("price_cents must be a positive integer.");
  if (seatCount === null) return badRequest("seat_count must be 1–1000.");
  if (equipment === null) return badRequest("equipment_items must be [{label, qty}] lines.");

  // Append at the end of the program's offer list.
  const { data: last } = await certDb
    .from("cert_offers")
    .select("position")
    .eq("program_id", programId)
    .order("position", { ascending: false })
    .limit(1);

  const { data, error } = await certDb
    .from("cert_offers")
    .insert({
      program_id: programId,
      name,
      description: optionalString(b.description, 2000) ?? null,
      price_cents: priceCents,
      seat_count: seatCount,
      equipment_items: equipment,
      position: (last?.[0]?.position ?? -1) + 1,
    })
    .select()
    .single();

  if (error) {
    console.error("cert offer create error:", error);
    return NextResponse.json({ error: "Failed to create offer." }, { status: 500 });
  }

  return NextResponse.json({ offer: data });
}
