// lib/server/certCodes.ts
// Token/code generation for the certification flow (extracted for
// unit-testability).

import { randomBytes } from "crypto";

/** Seat claim-link secret: 24 random bytes, base64url (~192 bits). */
export function generateClaimToken(): string {
  return randomBytes(24).toString("base64url");
}

// Short human-friendly code for the printed certificate + verify URL.
// 8 chars from a 32-char ambiguity-free alphabet (~40 bits) — enough
// for a low-value public lookup code; collisions retried on the
// unique constraint.
const VERIFY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateVerifyCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) code += VERIFY_ALPHABET[bytes[i] % VERIFY_ALPHABET.length];
  return `SB-${code.slice(0, 4)}-${code.slice(4)}`;
}
