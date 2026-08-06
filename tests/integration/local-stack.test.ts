// Integration tests against the LOCAL Supabase stack (scripts/local-db/
// setup.sh must have run). Gated on LOCAL_SUPABASE=1 so `npm run test`
// stays service-free. Everything here talks to 127.0.0.1 only.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { LOCAL_ANON_KEY, LOCAL_API_URL, LOCAL_SERVICE_KEY } from "../setup";

const RUN = process.env.LOCAL_SUPABASE === "1";
const d = describe.skipIf(!RUN);

// Mock the mobile-project client (auth lives on prod mobile — tests
// must never reach it) and Stripe BEFORE importing server modules.
const mobileInserts: { table: string; row: Record<string, unknown> }[] = [];
vi.mock("@/lib/server/supabaseMobile", () => {
  const chain = (table: string) => ({
    select: () => chain(table),
    eq: () => chain(table),
    maybeSingle: async () => ({ data: null, error: null }),
    insert: async (row: Record<string, unknown>) => {
      mobileInserts.push({ table, row });
      return { error: null };
    },
    update: () => ({ eq: async () => ({ error: null }) }),
  });
  return {
    getMobileSupabase: () => ({ from: (table: string) => chain(table) }),
    supabaseMobile: () => ({ from: (table: string) => chain(table) }),
  };
});

const stripeRetrieve = vi.fn();
vi.mock("@/lib/server/stripe", () => ({
  stripe: { checkout: { sessions: { retrieve: stripeRetrieve } } },
}));

// Imported dynamically AFTER mocks so module graphs pick them up.
const { handleSessionCompleted } = await import("@/lib/server/stripeWebhookHandler");
const { fulfillCertificationPurchase } = await import("@/lib/server/certFulfill");
const { buildCourseOutline, findActiveEnrollment } = await import("@/lib/server/certCourse");

const service = createClient(LOCAL_API_URL, LOCAL_SERVICE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(LOCAL_API_URL, LOCAL_ANON_KEY, {
  auth: { persistSession: false },
});

const PREFIX = `cs_vitest_${Date.now()}`;
const PROGRAM_ID = "10000000-0000-4000-8000-000000000001"; // seeded fixture program
const OFFER_CERT_ONLY = "10000000-0000-4000-8000-000000000011"; // 1 seat, no equipment
const OFFER_COMBO = "10000000-0000-4000-8000-000000000013"; // 3 seats + equipment

function fakeSession(overrides: Record<string, unknown>) {
  return {
    id: `${PREFIX}_${Math.random().toString(36).slice(2, 8)}`,
    payment_intent: "pi_test_123",
    payment_status: "paid",
    amount_total: 9900,
    currency: "usd",
    customer_details: { email: "tester@example.test", name: "Test Buyer", phone: null },
    collected_information: {
      shipping_details: {
        address: {
          line1: "1 Test St",
          line2: null,
          city: "Brooklyn",
          state: "NY",
          postal_code: "11201",
          country: "US",
        },
      },
    },
    metadata: {},
    custom_fields: [],
    ...overrides,
  } as never;
}

afterAll(async () => {
  if (!RUN) return;
  // Clean up everything this run created (cascade covers seats).
  await service.from("orders").delete().like("stripe_session_id", `${PREFIX}%`);
  await service.from("cert_purchases").delete().like("stripe_session_id", `${PREFIX}%`);
});

// ── Migration + RLS ─────────────────────────────────────────────

d("cert schema", () => {
  const tables = [
    "cert_programs",
    "cert_offers",
    "cert_sections",
    "cert_questions",
    "cert_purchases",
    "cert_seats",
    "cert_enrollments",
    "cert_quiz_attempts",
    "cert_certifications",
  ];

  it("all cert tables exist and are readable by service role", async () => {
    for (const t of tables) {
      const { error } = await service.from(t).select("id").limit(1);
      expect(error, `service read of ${t}`).toBeNull();
    }
  });

  it("anon gets NO access to any cert table (deny-all)", async () => {
    for (const t of tables) {
      const { data, error } = await anon.from(t).select("*").limit(1);
      // Either an explicit permission error or zero rows — never data.
      expect(data ?? [], `anon read of ${t}`).toHaveLength(0);
      expect(error, `anon read of ${t} should error`).not.toBeNull();
    }
  });
});

// ── Shop regression (queries mirror the live pages) ─────────────

d("shop regression", () => {
  it("anon reads active base/bundle products like /shop does", async () => {
    const { data, error } = await anon
      .from("products")
      .select("id, slug, name, images, kind, sort_order")
      .eq("active", true)
      .in("kind", ["base", "bundle"])
      .order("sort_order", { ascending: true });
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("anon reads product prices like /products/[slug] does", async () => {
    const { data: products } = await anon
      .from("products")
      .select("id")
      .eq("active", true)
      .limit(1);
    const { data, error } = await anon
      .from("product_prices")
      .select("id, unit_amount, currency, active, stripe_price_id")
      .eq("product_id", products![0].id);
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it("orders accept every status the app writes (incl. event/needs-match)", async () => {
    for (const status of ["pending", "processing", "fulfilled", "cancelled", "event", "needs-match"]) {
      const { error } = await service.from("orders").insert({
        stripe_session_id: `${PREFIX}_status_${status}`,
        order_data: {},
        fulfillment_status: status,
      });
      expect(error, `status ${status}`).toBeNull();
    }
  });
});

// ── Webhook regression (money path, mocked Stripe, real local DB) ──

d("webhook handler", () => {
  it("a normal shop session still upserts one orders row (idempotent)", async () => {
    const session = fakeSession({
      metadata: { order_summary: "1× SkyBall Racket", order_data_json: "[]" },
    });
    stripeRetrieve.mockResolvedValue({ ...(session as object), line_items: { data: [] } });

    const event = { data: { object: session } } as never;
    await handleSessionCompleted(event);
    await handleSessionCompleted(event); // webhook retry

    const { data } = await service
      .from("orders")
      .select("id, fulfillment_status, order_total_cents")
      .eq("stripe_session_id", (session as { id: string }).id);
    expect(data).toHaveLength(1);
    expect(data![0].fulfillment_status).toBe("pending");
    expect(data![0].order_total_cents).toBe(9900);
  });

  it("an event_registration session tags 'event' and dual-writes mobile", async () => {
    mobileInserts.length = 0;
    const session = fakeSession({
      metadata: {
        kind: "event_registration",
        tournament_id: "t-123",
        order_summary: "Tournament entry: Test Open ($25)",
      },
    });
    stripeRetrieve.mockResolvedValue({ ...(session as object), line_items: { data: [] } });

    await handleSessionCompleted({ data: { object: session } } as never);

    const { data } = await service
      .from("orders")
      .select("fulfillment_status")
      .eq("stripe_session_id", (session as { id: string }).id);
    expect(data![0].fulfillment_status).toBe("event");
    expect(mobileInserts).toHaveLength(1);
    expect(mobileInserts[0].table).toBe("tournament_entries");
  });
});

// ── Certification fulfillment ───────────────────────────────────

d("certification fulfillment", () => {
  it("cert-only: purchase + seats, NO orders row, idempotent", async () => {
    const session = fakeSession({
      metadata: { kind: "certification_purchase", offer_id: OFFER_CERT_ONLY, qty: "2" },
    });

    const first = await fulfillCertificationPurchase(session);
    const second = await fulfillCertificationPurchase(session); // success-page race

    expect(first).not.toBeNull();
    expect(first!.seats).toHaveLength(2); // 1 seat × qty 2
    expect(second!.purchaseId).toBe(first!.purchaseId);
    expect(second!.seats).toHaveLength(2);

    const { data: orders } = await service
      .from("orders")
      .select("id")
      .eq("stripe_session_id", (session as { id: string }).id);
    expect(orders).toHaveLength(0); // owner decision: no orders row
  });

  it("combo: purchase + seats + exactly one pending orders row at full price", async () => {
    const session = fakeSession({
      amount_total: 79900,
      metadata: { kind: "certification_purchase", offer_id: OFFER_COMBO, qty: "1" },
    });

    const result = await fulfillCertificationPurchase(session);
    await fulfillCertificationPurchase(session);

    expect(result!.seats).toHaveLength(3);

    const { data: orders } = await service
      .from("orders")
      .select("fulfillment_status, order_total_cents, shipping_address, order_summary")
      .eq("stripe_session_id", (session as { id: string }).id);
    expect(orders).toHaveLength(1);
    expect(orders![0].fulfillment_status).toBe("pending");
    expect(orders![0].order_total_cents).toBe(79900);
    expect(orders![0].shipping_address).toMatchObject({ city: "Brooklyn" });
    expect(orders![0].order_summary).toContain("Certification seat");
    expect(orders![0].order_summary).toContain("SkyBall Racket");
  });

  it("webhook route dispatches cert purchases away from the default orders path", async () => {
    const session = fakeSession({
      metadata: { kind: "certification_purchase", offer_id: OFFER_CERT_ONLY, qty: "1" },
    });
    await handleSessionCompleted({ data: { object: session } } as never);
    const { data: orders } = await service
      .from("orders")
      .select("id")
      .eq("stripe_session_id", (session as { id: string }).id);
    expect(orders).toHaveLength(0);
    const { data: purchases } = await service
      .from("cert_purchases")
      .select("id")
      .eq("stripe_session_id", (session as { id: string }).id);
    expect(purchases).toHaveLength(1);
  });
});

// ── Claim + course outline ──────────────────────────────────────

d("claim and course outline", () => {
  const userId = "99999999-0000-4000-8000-000000000001";
  let seatId: string;

  beforeAll(async () => {
    if (!RUN) return;
    const session = fakeSession({
      metadata: { kind: "certification_purchase", offer_id: OFFER_CERT_ONLY, qty: "1" },
    });
    const result = await fulfillCertificationPurchase(session);
    seatId = result!.seats[0].id;
  });

  it("claim race: only one conditional update wins", async () => {
    const claim = () =>
      service
        .from("cert_seats")
        .update({ status: "claimed", claimed_by_user_id: userId })
        .eq("id", seatId)
        .eq("status", "unclaimed")
        .select("id")
        .maybeSingle();
    const [a, b] = [await claim(), await claim()];
    expect([a.data, b.data].filter(Boolean)).toHaveLength(1);
  });

  it("course outline never leaks answers or explanations", async () => {
    await service.from("cert_enrollments").insert({
      seat_id: seatId,
      program_id: PROGRAM_ID,
      user_id: userId,
    });
    const enrollment = await findActiveEnrollment(userId);
    expect(enrollment).not.toBeNull();

    const outline = await buildCourseOutline(enrollment!);
    expect(outline).not.toBeNull();
    expect(outline!.sections.length).toBeGreaterThan(0);
    expect(outline!.sections[0].questions.length).toBeGreaterThan(0);

    const raw = JSON.stringify(outline);
    expect(raw).not.toContain("correct_index");
    expect(raw).not.toContain("correctIndex");
    expect(raw).not.toContain("explanation");
  });

  it("revoking the seat kills course access", async () => {
    await service.from("cert_seats").update({ status: "revoked" }).eq("id", seatId);
    const enrollment = await findActiveEnrollment(userId);
    expect(enrollment).toBeNull();
  });
});
