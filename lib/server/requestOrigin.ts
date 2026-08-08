// lib/server/requestOrigin.ts
// Resolve a SAFE origin for Stripe success/cancel URLs.
//
// SECURITY: the raw `Origin` header is attacker-controlled — anyone can
// POST a checkout request with `Origin: https://evil.tld` and receive a
// genuine Stripe Checkout URL that redirects the payer to their site.
// That matters for certification checkout because the success URL
// carries the Stripe session id, and GET /api/certification/purchase
// trades that id for every seat claim token in the purchase. So an
// unvalidated origin turns into seat theft. Always resolve through an
// allowlist and fall back to the configured app URL.

import "server-only";

function normalize(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Origins allowed as Stripe redirect targets. */
function allowedOrigins(): string[] {
  const list = [
    normalize(process.env.NEXT_PUBLIC_APP_URL),
    normalize(process.env.NEXT_PUBLIC_SITE_URL),
    "https://skyball.us",
    "https://www.skyball.us",
    // Vercel sets VERCEL_URL to this deployment's own host. It is
    // platform-supplied (not attacker-controlled), so trusting it keeps
    // checkout working on preview deployments instead of bouncing the
    // payer to production.
    process.env.VERCEL_URL ? normalize(`https://${process.env.VERCEL_URL}`) : null,
  ];
  // Local development hosts (never present in production requests).
  if (process.env.NODE_ENV !== "production") {
    list.push("http://localhost:3000", "http://127.0.0.1:3000");
  }
  return list.filter((v): v is string => Boolean(v));
}

/**
 * The request's origin when it is one we trust, else the configured app
 * URL. Never returns an attacker-supplied host.
 */
export function resolveOrigin(request: Request): string | null {
  const fallback =
    normalize(process.env.NEXT_PUBLIC_APP_URL) ??
    normalize(process.env.NEXT_PUBLIC_SITE_URL) ??
    "https://skyball.us";

  const requested = normalize(request.headers.get("origin"));
  if (requested && allowedOrigins().includes(requested)) return requested;

  return fallback;
}
