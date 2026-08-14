// Integration tests for the site intake tables (notification_signups /
// site_inquiries) against the LOCAL Supabase stack — scripts/local-db/setup.sh
// must have run. Gated on LOCAL_SUPABASE=1 so `npm run test` stays
// service-free. Everything here talks to 127.0.0.1 only.
//
// These drive the real server actions, because the invariants that matter
// (RPC-not-insert, server-set country_code/source, DB-before-Telegram) live in
// the actions, not in the table definitions.
//
// tests/setup.ts deletes TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID, so every
// submission here runs with Telegram deliberately broken — which is exactly
// the "Telegram failure never fails the request" check.

import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { LOCAL_ANON_KEY, LOCAL_API_URL, LOCAL_SERVICE_KEY } from "../setup";

const RUN = process.env.LOCAL_SUPABASE === "1";
const d = describe.skipIf(!RUN);

const { subscribeToOpenPlayNotifications } = await import("@/app/actions/open-play-notifications");
const { submitSubscription } = await import("@/app/actions/subscription");
const { submitInfoRequest } = await import("@/app/actions/info-request");

const service = createClient(LOCAL_API_URL, LOCAL_SERVICE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(LOCAL_API_URL, LOCAL_ANON_KEY, {
  auth: { persistSession: false },
});

const PREFIX = `vitest-intake-${Date.now()}`;
const email = (tag: string) => `${PREFIX}-${tag}@example.test`;

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

function signupForm(overrides: Record<string, string> = {}): FormData {
  return form({
    name: "Vitest Signup",
    email: email("signup"),
    locality: "Brooklyn, NY",
    notifyOpenPlay: "true",
    notifyTournaments: "false",
    notifyPopUps: "false",
    notifySpecialEvents: "false",
    ...overrides,
  });
}

async function signupRows(addr: string) {
  const { data, error } = await service
    .from("notification_signups")
    .select("*")
    .eq("email", addr);
  expect(error).toBeNull();
  return data ?? [];
}

afterAll(async () => {
  if (!RUN) return;
  await service.from("notification_signups").delete().like("email", `${PREFIX}%`);
  await service.from("site_inquiries").delete().like("name", `${PREFIX}%`);
});

// ── Schema + RLS ────────────────────────────────────────────────

d("site intake schema", () => {
  const tables = ["notification_signups", "site_inquiries"];

  it("both tables exist and are readable by the service role", async () => {
    for (const t of tables) {
      const { error } = await service.from(t).select("id").limit(1);
      expect(error, `service read of ${t}`).toBeNull();
    }
  });

  it("anon gets NO access to either table (deny-all, PII)", async () => {
    for (const t of tables) {
      const { data, error } = await anon.from(t).select("*").limit(1);
      expect(data ?? [], `anon read of ${t}`).toHaveLength(0);
      expect(error, `anon read of ${t} should error`).not.toBeNull();
    }
  });

  it("anon cannot write either table", async () => {
    const { error: signupErr } = await anon.from("notification_signups").insert({
      name: "anon",
      email: email("anon"),
      country_code: "US",
      locality: "Nowhere",
      notification_types: ["newsletter"],
      source: "newsletter_form",
    });
    expect(signupErr).not.toBeNull();

    const { error: inquiryErr } = await anon.from("site_inquiries").insert({
      kind: "general",
      name: `${PREFIX} anon`,
      email: email("anon-inq"),
      country_code: "US",
    });
    expect(inquiryErr).not.toBeNull();
  });
});

// ── Notification signups ────────────────────────────────────────

d("notification signups", () => {
  it("writes a row with server-set country_code and source, despite broken Telegram", async () => {
    const result = await subscribeToOpenPlayNotifications(signupForm());
    expect(result.success).toBe(true);

    const rows = await signupRows(email("signup"));
    expect(rows).toHaveLength(1);
    expect(rows[0].country_code).toBe("US");
    expect(rows[0].source).toBe("notification_form");
    expect(rows[0].notification_types).toEqual(["open_play"]);
    expect(rows[0].name).toBe("Vitest Signup");
    expect(rows[0].locality).toBe("Brooklyn, NY");
  });

  it("ignores country_code and source supplied in the request body", async () => {
    const result = await subscribeToOpenPlayNotifications(
      signupForm({
        country_code: "ZZ",
        countryCode: "ZZ",
        source: "newsletter_form",
        notifyTournaments: "true",
      }),
    );
    expect(result.success).toBe(true);

    const rows = await signupRows(email("signup"));
    expect(rows).toHaveLength(1);
    expect(rows[0].country_code).toBe("US");
    expect(rows[0].source).toBe("notification_form");
  });

  it("merges a repeat signup instead of duplicating it (proves the RPC path)", async () => {
    // The call above added tournaments to the same email — one row, union of types.
    const rows = await signupRows(email("signup"));
    expect(rows).toHaveLength(1);
    expect([...(rows[0].notification_types as string[])].sort()).toEqual([
      "open_play",
      "tournaments",
    ]);
    expect(new Date(rows[0].updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(rows[0].created_at).getTime(),
    );
  });

  it("unions the newsletter form onto the same subscriber", async () => {
    const result = await submitSubscription(
      form({
        name: "Vitest Signup",
        email: email("signup"),
        zip: "11201",
        subject: "Subscription! New Subscriber",
      }),
    );
    expect(result.success).toBe(true);

    const rows = await signupRows(email("signup"));
    expect(rows).toHaveLength(1);
    expect([...(rows[0].notification_types as string[])].sort()).toEqual([
      "newsletter",
      "open_play",
      "tournaments",
    ]);
    expect(rows[0].source).toBe("newsletter_form");
    expect(rows[0].locality).toBe("11201");
  });

  it("rejects a signup with no locality and writes nothing", async () => {
    const result = await subscribeToOpenPlayNotifications(
      signupForm({ email: email("no-locality"), locality: "" }),
    );
    expect(result.success).toBe(false);
    expect(await signupRows(email("no-locality"))).toHaveLength(0);
  });

  it("silently drops a honeypot submission", async () => {
    const result = await subscribeToOpenPlayNotifications(
      signupForm({ email: email("honeypot"), website: "http://spam.example" }),
    );
    expect(result.success).toBe(true); // looks normal to the bot
    expect(await signupRows(email("honeypot"))).toHaveLength(0);
  });
});

// ── Site inquiries ──────────────────────────────────────────────

d("site inquiries", () => {
  const inquiryForm = (overrides: Record<string, string> = {}) =>
    form({
      name: `${PREFIX} Inquirer`,
      email: email("inquiry"),
      phone: "",
      message: "Tell me more",
      location: "Brooklyn, NY",
      subject: "General Information Request",
      ...overrides,
    });

  async function inquiryRows(subject: string) {
    const { data, error } = await service
      .from("site_inquiries")
      .select("*")
      .like("name", `${PREFIX}%`)
      .eq("details->>subject", subject);
    expect(error).toBeNull();
    return data ?? [];
  }

  it("maps each known subject onto its kind", async () => {
    const cases: [string, string][] = [
      ["School Information Request", "school"],
      ["Host Information Request", "host"],
      ["Where can I play?", "where_to_play"],
      ["General Information Request", "general"],
    ];

    for (const [subject, kind] of cases) {
      const result = await submitInfoRequest(inquiryForm({ subject }));
      expect(result.success, `submit ${subject}`).toBe(true);

      const rows = await inquiryRows(subject);
      expect(rows, `rows for ${subject}`).toHaveLength(1);
      expect(rows[0].kind).toBe(kind);
      expect(rows[0].country_code).toBe("US");
      expect(rows[0].locality).toBe("Brooklyn, NY");
    }
  });

  it("falls back to 'general' for an unlisted subject and keeps the original", async () => {
    // /shop sends this one; it is not in the kind CHECK constraint.
    const result = await submitInfoRequest(inquiryForm({ subject: "Product Inquiry" }));
    expect(result.success).toBe(true);

    const rows = await inquiryRows("Product Inquiry");
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("general");
    expect(rows[0].details.subject).toBe("Product Inquiry");
  });

  it("stores schoolInfo in details and is append-only", async () => {
    const subject = "School Information Request";
    await submitInfoRequest(
      inquiryForm({ subject, schoolInfo: "PS 321, Brooklyn, NY" }),
    );

    const rows = await inquiryRows(subject);
    // Second submission of the same subject — inquiries never dedupe.
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.details?.schoolInfo === "PS 321, Brooklyn, NY")).toBe(true);
  });

  it("silently drops a honeypot submission", async () => {
    const result = await submitInfoRequest(
      inquiryForm({ subject: "Honeypot Probe", website: "http://spam.example" }),
    );
    expect(result.success).toBe(true);
    expect(await inquiryRows("Honeypot Probe")).toHaveLength(0);
  });

  // The rule is subject-independent, so two representatives cover it: the
  // one we tightened first, and the CHECK-constraint fallback subject.
  it("requires locality on every inquiry subject, server-side", async () => {
    for (const subject of ["Host Information Request", "Product Inquiry"]) {
      const before = (await inquiryRows(subject)).length;

      const result = await submitInfoRequest(inquiryForm({ subject, location: "" }));
      expect(result.success, `blank locality for ${subject}`).toBe(false);
      expect(result.fieldErrors?.location?.[0]).toMatch(/city or zip/i);

      expect(await inquiryRows(subject), `no new row for ${subject}`).toHaveLength(before);
    }
  });

  it("rejects an inquiry with neither email nor phone", async () => {
    const result = await submitInfoRequest(
      inquiryForm({ subject: "No Contact Probe", email: "", phone: "" }),
    );
    expect(result.success).toBe(false);
    expect(await inquiryRows("No Contact Probe")).toHaveLength(0);
  });
});

// ── Throttle (runs last: it deliberately exhausts the signup bucket) ──

d("per-IP throttle", () => {
  it("stops accepting signups once the window limit is hit", async () => {
    let throttled: { success: boolean; message: string } | null = null;

    for (let i = 0; i < 15 && !throttled; i++) {
      const addr = email(`throttle-${i}`);
      const result = await subscribeToOpenPlayNotifications(signupForm({ email: addr }));
      if (!result.success) {
        throttled = result;
        expect(await signupRows(addr)).toHaveLength(0);
      }
    }

    expect(throttled, "expected the throttle to trip within 15 submissions").not.toBeNull();
    expect(throttled!.message).toMatch(/too many submissions/i);
  });
});
