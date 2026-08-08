// Regression tests for the security fixes from the 2026-08-06 review.

import { describe, expect, it } from "vitest";
import { resolveOrigin } from "@/lib/server/requestOrigin";

function req(origin?: string) {
  return new Request("https://skyball.us/api/certification/checkout", {
    method: "POST",
    headers: origin ? { origin } : {},
  });
}

describe("resolveOrigin (Stripe redirect target allowlist)", () => {
  it("rejects attacker-supplied origins and falls back to the app URL", () => {
    for (const evil of [
      "https://evil.tld",
      "http://skyball.us.evil.tld",
      "https://skyball.us.attacker.com",
      "null",
      "javascript:alert(1)",
    ]) {
      const resolved = resolveOrigin(req(evil));
      expect(resolved).not.toContain("evil");
      expect(resolved).not.toContain("attacker");
      expect(resolved?.startsWith("http")).toBe(true);
    }
  });

  it("accepts the canonical production origins", () => {
    expect(resolveOrigin(req("https://skyball.us"))).toBe("https://skyball.us");
    expect(resolveOrigin(req("https://www.skyball.us"))).toBe("https://www.skyball.us");
  });

  it("accepts localhost outside production (dev checkout testing)", () => {
    expect(resolveOrigin(req("http://localhost:3000"))).toBe("http://localhost:3000");
  });

  it("falls back when no origin header is sent", () => {
    expect(resolveOrigin(req())?.startsWith("http")).toBe(true);
  });
});

describe("inline analytics script escaping", () => {
  // Mirrors the jsLiteral helper in components/google-analytics.tsx.
  const jsLiteral = (v: string) => JSON.stringify(v).replace(/</g, "\\u003c");

  // Mirrors the real inline script shape in google-analytics.tsx: the
  // pathname is interpolated as an object-literal property value.
  function buildScript(pathname: string) {
    return `
      var dataLayer = [];
      function gtag(){ dataLayer.push(arguments); }
      gtag('config', 'G-TEST', {
        page_path: ${jsLiteral(pathname)},
      });
    `;
  }

  function execute(script: string) {
    let alerted = false;
    const alert = () => {
      alerted = true;
    };
    new Function("alert", script)(alert);
    return alerted;
  }

  it.each([
    // The working exploit: no braces or spaces, so it survives URL path
    // percent-encoding, and it injects a valid extra property whose
    // value is a call expression — which runs when the object literal
    // is constructed. Pre-fix this executed; the naive `';alert(1)//`
    // payload only produced a SyntaxError inside the object literal.
    ["property-injection breakout", "/x',bad:alert(1),c:'"],
    ["quote breakout", "/x';alert(1)//"],
    ["script-tag payload", "/a</script><script>alert(1)</script>"],
  ])("payload is inert: %s", (_label, payload) => {
    expect(execute(buildScript(payload))).toBe(false);
  });

  it("still passes the real pathname through as data", () => {
    const payload = "/x',bad:alert(1),c:'";
    let received: unknown;
    const script = `
      function gtag(_cmd, _id, params){ capture(params.page_path); }
      gtag('config', 'G-TEST', { page_path: ${jsLiteral(payload)} });
    `;
    new Function("capture", script)((v: unknown) => {
      received = v;
    });
    expect(received).toBe(payload);
  });

  it("escapes < so a value can never emit </script>", () => {
    expect(jsLiteral("/a</script><script>alert(1)</script>")).not.toContain("</script>");
  });

  it("handles quotes, backslashes, and newlines", () => {
    for (const input of ['/a"b', "/a\\b", "/a\nb", "/a'b"]) {
      expect(eval(jsLiteral(input))).toBe(input);
    }
  });
});
