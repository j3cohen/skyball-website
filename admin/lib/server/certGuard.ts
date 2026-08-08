// lib/server/certGuard.ts
// Shared guard for /api/admin/certification/* routes: admin session +
// rate limit in one call (same checks every existing admin route does
// inline). Returns { session } on success or { response } to return.

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimiter";
import type { Session } from "@supabase/auth-helpers-nextjs";

export async function guardCertAdmin(): Promise<
  { session: Session; response?: never } | { session?: never; response: NextResponse }
> {
  const session = await requireAdminSession();
  if (!session) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  const { allowed } = rateLimit(session.user.id, 240, 60_000);
  if (!allowed) {
    return {
      response: NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": "60" } }
      ),
    };
  }
  return { session };
}

/** Parse request JSON, or null when the body is not valid JSON. */
export async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// ── field validators (manual validation per admin-route convention) ──

export function optionalString(v: unknown, max = 10_000): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  return v.slice(0, max);
}

export function requiredString(v: unknown, max = 10_000): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return v.trim().slice(0, max);
}

export function intInRange(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) return null;
  return v;
}

export function thresholdType(v: unknown): "percent" | "count" | null {
  return v === "percent" || v === "count" ? v : null;
}

export type EquipmentItem = { label: string; qty: number };

/** Validate the free-text equipment lines of an offer. */
export function equipmentItems(v: unknown): EquipmentItem[] | null {
  if (!Array.isArray(v) || v.length > 50) return null;
  const out: EquipmentItem[] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null) return null;
    const { label, qty } = item as Record<string, unknown>;
    const cleanLabel = requiredString(label, 200);
    const cleanQty = intInRange(qty, 1, 10_000);
    if (!cleanLabel || cleanQty === null) return null;
    out.push({ label: cleanLabel, qty: cleanQty });
  }
  return out;
}
