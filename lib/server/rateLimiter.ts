// lib/server/rateLimiter.ts
// In-memory fixed-window rate limiter for the main site's public API
// routes (ported from admin/lib/server/rateLimiter.ts). Per-instance
// only — good enough to blunt abuse of the certification endpoints;
// a durable store can replace it later without changing call sites.

import "server-only";

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Prune expired entries every minute.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000).unref?.();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }
  entry.count++;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

/** Client IP for rate-limit keying (first x-forwarded-for hop on Vercel). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Guard helper: returns a 429 Response when the caller exceeded
 * `limit` per `windowMs` for this route bucket, else null.
 */
export function rateLimitResponse(
  request: Request,
  bucket: string,
  limit: number,
  windowMs = 60_000
): Response | null {
  const { allowed } = rateLimit(`${bucket}:${clientIp(request)}`, limit, windowMs);
  if (allowed) return null;
  return Response.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
  );
}
