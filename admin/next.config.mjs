/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-eval' only in dev — Next compiles client chunks with eval() for HMR
  // and source maps, so without it NO client JS runs locally: React never
  // hydrates, forms fall back to native submits, and charts render blank.
  // Production builds contain no eval, so the prod policy stays strict.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Dev also allows the HMR socket and a LOCAL Supabase stack. Both
  // localhost and 127.0.0.1 are listed: CSP matches hosts literally, so
  // `http://localhost:*` does NOT cover `http://127.0.0.1:54341` and the
  // browser would block auth/REST calls with an opaque "Load failed".
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${
    isProd ? "" : " ws://localhost:* http://localhost:* ws://127.0.0.1:* http://127.0.0.1:*"
  }`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // upgrade-insecure-requests only in production — in dev it forces localhost to https
  ...(isProd ? ["upgrade-insecure-requests"] : []),
];
const csp = cspDirectives.join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
  },
  { key: "Content-Security-Policy", value: csp },
  // HSTS only in production — sending it on localhost permanently forces https for that port
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
