# Coaching Certification — build notes & handoff

Sellable coaching-certification program on skyball.us. Built on `dev` in commit `6649c62`
(2026-08-06): public sales + course + certificate pages, learner APIs, an admin authoring
console, 9 new DB tables, a Stripe fulfillment branch, a local Supabase test stack, and a
vitest suite.

**Status:** feature-complete on `dev`; both apps build clean. Not yet launched — see
[Before launch](#before-launch--open-items).

---

## Try it without a database

These two URLs need no DB, no seat, no login. Start the dev server (`npm run dev`) and open:

| What | URL |
|---|---|
| **Course demo** — fixture content, client-side grading, nothing persisted | `/coaching/course?demo=1` |
| **Certificate design** — the same component a real certificate renders, watermarked SAMPLE | `/coaching/certificate/preview` |
| Public sales page — needs one `status='published'` row in `cert_programs` | `/coaching` |

The demo course's end-of-course certificate link resolves to `/coaching/certificate/preview`
(its mock cert uses `verifyCode: "preview"`), so the demo walks the whole learner arc.

Both demo pages are `noindex` — the course via `app/coaching/course/layout.tsx` (covers
`?demo=1` too), the preview via its own page metadata — so they're safe on a Vercel preview
deploy.

To exercise the **real** flow locally (claim → course → quiz → issued certificate) without
Stripe: bring up the local stack (below), then `scripts/local-db/grant-test-seat.sh [seats]`
mints `cert_purchases` + `cert_seats` rows against the seeded fixture program and prints
`http://localhost:3000/coaching/claim/<token>` links.

---

## Public routes — `app/coaching/**`

| Route | Auth | Notes |
|---|---|---|
| `/coaching` | none | Sales page. Reads first published `cert_programs` + its sections + active `cert_offers`. Indexed. |
| `/coaching/course` | Bearer (mobile session) | The course itself. `?demo=1` → fixture mode. **noindex** |
| `/coaching/purchased?session_id=cs_…` | ⚠️ none — the Stripe `session_id` **is** the credential | Post-checkout page; polls the purchase endpoint every 2s ×10 to absorb webhook lag, then lists one claim link per seat |
| `/coaching/claim/[token]` | Bearer to redeem | ⚠️ the `claim_token` **is** the credential. Signed out → `/login?from=…` |
| `/coaching/certificate/[code]` | none (verify code is the credential) | Print-friendly real certificate. **noindex** |
| `/coaching/certificate/preview` | none | Sample certificate. Static route wins over `[code]`. **noindex** |
| `/coaching/verify/[code]` | none | Public verification: valid / expired / revoked. **noindex** |

Shared components live in `components/certification/` — `course-shell.tsx` (props-driven, so
fixture and live data render identically), `certificate-view.tsx` (one artwork for real +
preview, so they can't drift), `offer-purchase.tsx`, `print-button.tsx`.

## Learner API — `app/api/certification/**`

All `force-dynamic`, all rate-limited via `lib/server/rateLimiter.ts`.

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /course` | Bearer | Sanitized course outline + per-section pass state + cooldowns |
| `POST /quiz-submit` | Bearer | Server-side grading; enforces cooldown (429 + `retryAt`); returns full answer reveal |
| `POST /certificate` | Bearer | Issue certificate once enrollment is `completed`; idempotent |
| `GET /certificate` | Bearer | Fetch the learner's own certificate |
| `POST /claim` | Bearer | Redeem a claim token → seat `claimed` + enrollment |
| `POST /checkout` | none | Stripe session; price re-derived server-side from `cert_offers` (client sends only `offerId` + `qty`) |
| `GET /purchase?session_id=` | ⚠️ none | Success-page fulfillment + seat tokens |
| `GET /verify?code=` | none | Public verification |

Main-site sessions live in **localStorage**, not cookies, so learner routes take
`Authorization: Bearer <access_token>` — see `lib/certification/client.ts` (`certFetch`) and
`lib/server/certLearnerAuth.ts`. **Learner identity is the mobile Supabase project**, not the
website one.

## Admin

`/certification` in the admin app (`npm run admin`, port 3001) — three tabs:

- **Programs** — list + create; opens `cert-program-editor.tsx`: pass rules, cooldown, expiry,
  publish/archive, offers (packs, incl. equipment combos), ordered sections. The section
  slide-over (`cert-section-panel.tsx`) edits intro slide, YouTube URL (live preview),
  per-section rule overrides, and the quiz question list.
- **Purchases & Seats** — every purchase with its seats, copy-claim-link buttons, seat
  revoke/restore.
- **Certified Coaches** — registry with active/expired/revoked filter + CSV export.

13 routes under `admin/app/api/admin/certification/`, each behind `guardCertAdmin()`
(`admin/lib/server/certGuard.ts`).

> `admin/lib/server/certDb.ts` is a deliberately **untyped** service-role client, because
> `admin/lib/database.types.ts` predates the `cert_*` tables. Regenerate those types and this
> can fold back into the normal typed client.

---

## Data model — `supabase/migrations/20260805_certifications.sql`

Runs on the **website** Supabase project (`cnhxpeadrylpssryywsd`), authored to Global
conventions so it lifts into the redesign.

| Table | Purpose |
|---|---|
| `cert_programs` | One program: content rules (pass threshold, cooldown, expiry months, status, slug). No pricing here. |
| `cert_offers` | Purchasable packs: price, seat count, `equipment_items` jsonb (`[]` = cert-only, non-empty = combo) |
| `cert_sections` | Ordered sections; optional intro slide, video URL, nullable rule overrides (NULL = inherit program) |
| `cert_questions` | Multiple choice: `choices`, `correct_index`, optional `explanation` |
| `cert_purchases` | Money side, one row per Stripe session |
| `cert_seats` | One row per purchased seat; `claim_token` is the claim-link secret |
| `cert_enrollments` | One per claimed seat |
| `cert_quiz_attempts` | Every graded attempt; answers snapshotted as jsonb |
| `cert_certifications` | The credential registry; `verify_code`, issue/expiry dates, status |

Invariants that aren't obvious from the DDL:

- **RLS is enabled on all nine tables with zero policies** — deny-all for anon/authenticated.
  Every read/write goes through a Bearer-authenticated server route or a service-role admin
  route. Adding a policy would be a regression, not a fix.
- `cert_purchases.stripe_session_id UNIQUE` doubles as the **idempotency backstop**.
- Learner ids (`user_id`, `claimed_by_user_id`) are **mobile-project** `auth.users` uuids
  stored as plain uuid — no FK, because they live in a different Supabase project.
- **No progress column.** Section pass state is derived from `cert_quiz_attempts`; the latest
  failed attempt is the cooldown source of truth. Editing questions later never rewrites
  history.
- **Course completion is derived too.** `cert_enrollments.status` is a cache written by
  quiz-submit; the certificate route gates on `allSectionsPassed()`, not on that column.
  Don't reintroduce a `status === "completed"` gate — a program with no quizzes never writes
  it, and the learner would be permanently unable to claim a certificate.
- `cert_sections.position` is intentionally not unique, so reorder is one statement.
- Recert after expiry = a new seat. The "one active enrollment per user+program" rule is
  enforced in the claim route, not by a constraint.

### Section shapes

A section carries any combination of intro slide, video, and quiz — the player walks
`stepsFor()` (`lib/certification/types.ts`) rather than assuming `intro → video → quiz`. That
makes the intended authoring pattern **a run of video-only sections followed by a standalone
quiz section** ("Module 1 Quiz" — questions, no video).

- A section with **no questions auto-passes** on enrollment (`lib/server/certCourse.ts`), so it
  never gates progress. That is deliberate: watching isn't enforced and can't be — a YouTube
  iframe won't reliably report completion.
- Because auto-pass would otherwise make video sections invisible, the player **always opens at
  section 1** and every section opens at its **first content step**, never at a results screen.
- The left stepper distinguishes the two: a **green ✓** means a quiz was genuinely passed; a
  **grey ✓** means a video/intro section has been opened in this browser (tracked in
  localStorage under `skyball_cert_visited_v1`, cosmetic only).
- An **unpassed quiz still gates** everything after it — that's the module boundary.

## Money path

`app/api/webhooks/stripe/route.ts` now only verifies the signature and dispatches;
`handleSessionCompleted` moved to `lib/server/stripeWebhookHandler.ts` so the money path is
testable. Its first branch:

```ts
if (meta.kind === "certification_purchase") { await fulfillCertificationPurchase(session); return }
```

`lib/server/certFulfill.ts`:

- **Cert-only offer** → purchase + seats, and **no `orders` row at all**. Revenue lives in
  `cert_purchases`.
- **Combo offer** → **exactly one** `orders` row, full pack price, `pending`, with shipping
  address, plus an `order_data.certification` block — so combos hit fulfillment and revenue
  dashboards.
- **Idempotency:** insert into `cert_purchases`; on `23505` re-query and adopt the winner's
  row. Only the caller that actually inserted creates seats and fires the Telegram alert.
- `GET /api/certification/purchase` calls the identical function, so whichever of
  webhook/success-page lands first wins and the other finds the rows.

## Security decisions worth not re-deriving

- `lib/server/requestOrigin.ts` — `resolveOrigin()` **allowlists** Stripe redirect origins. An
  unvalidated `Origin` header would let an attacker receive a genuine checkout URL whose
  success page hands over every seat claim token. Don't "simplify" this back to
  `request.headers.get("origin")`.
- `buildCourseOutline` (`lib/server/certCourse.ts`) must **never** emit `correct_index` or
  `explanation`. There's an automated stringify scan in the integration tests guarding it.
- ⚠️ `lib/server/rateLimiter.ts` is in-memory and **per-instance** — real but partial
  protection on serverless. Swappable for a durable store without changing call sites.
- Login `?from=` is sanitized by `safeReturnPath()` in `app/login/page.tsx` (rejects `//` and
  absolute URLs), so a claim link can't be used to bounce a signed-in user off-site.

---

## Testing

```
npm test                 # unit — pure logic, no services needed
npm run test:integration # needs the local stack up (sets LOCAL_SUPABASE=1)
npm run test:all
```

- `tests/unit/cert-logic.test.ts` — YouTube id extraction, pass-threshold math, cooldowns,
  code generation, fixture grading consistency.
- `tests/unit/security.test.ts` — regression tests for the 2026-08-06 security review
  (`resolveOrigin` rejections, analytics script escaping).
- `tests/integration/local-stack.test.ts` — self-skips unless `LOCAL_SUPABASE=1`; talks only
  to 127.0.0.1. Covers deny-all RLS, no-regression on shop/orders/event webhook paths,
  cert-only vs combo fulfillment, claim races, answer-leak scan, revoked-seat access.
- `tests/setup.ts` points every Supabase client at the local stack so importing a server
  module can never construct a prod-facing client.

### Local Supabase stack — `scripts/local-db/`

The website Supabase project has **no staging** (staging belongs to the frozen mobile
project), so testing happens against a local Docker clone.

- `setup.sh` — idempotent: `supabase start` (ports 5434x — API `54341`, DB `54342`), apply the
  prod schema baseline, apply repo migrations, apply the cert migration **behind a schema-diff
  guard that asserts it adds only `cert_*` objects**, seed catalog + fixture program, create a
  local admin (`admin@local.test` / `localadmin`).
- `env-mode.sh status|local|prod` — swaps `.env.local` between prod and local website-DB vars
  by commenting lines with a `#__LOCALDB#` marker; real keys are never deleted. Only
  website-project vars are touched.
- `grant-test-seat.sh [seats]` — mints local seats and prints claim links.

> Uses `127.0.0.1`, not `localhost`, deliberately: supabase-js derives the auth cookie name
> from the first hostname label, so `localhost` collides with other local Supabase projects
> and silently breaks admin login.

## Environment variables

New, and **local-testing only** — leave unset in Vercel, where they fall back to the hardcoded
website project values:

- `NEXT_PUBLIC_WEBSITE_SUPABASE_URL`, `NEXT_PUBLIC_WEBSITE_SUPABASE_ANON_KEY`
- `LOCAL_SUPABASE=1` — gate for the integration suite

Newly load-bearing (already set in prod): `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` —
`resolveOrigin()` returns 500 on checkout if neither resolves. `VERCEL_URL` is trusted so
preview deploys keep checkout working.

See `.env.local.example-localdb` for the full local block. ⚠️ Always use Stripe **test** keys
locally — repo history contains live keys.

---

## Before launch — open items

- [ ] Run `supabase/migrations/20260805_certifications.sql` on the website project (owner-manual;
      a PreToolUse hook blocks agent writes to prod)
- [ ] Run `supabase/migrations/20260806_orders_status_constraint.sql` — ⚠️ **latent prod bug**:
      `orders_fulfillment_status_check` doesn't allow `'event'` / `'needs-match'`, so the first
      paid event registration throws on the orders upsert and aborts the mobile dual-write
- [ ] Stripe test-mode E2E: cert-only and combo offers; confirm the webhook ↔ success-page race
      produces exactly one purchase, N seats, and (combo only) one `pending` order
- [ ] Author and publish a real program in admin — `/coaching` renders nothing without one
- [ ] ⚠️ `/coaching` is indexable but is missing from `app/sitemap.ts` and unlinked from
      `components/navbar.tsx` / `footer.tsx` — decide whether to list/link it
- [ ] ⚠️ `app/robots.ts` doesn't disallow `/coaching/purchased` or `/coaching/claim/*`, and
      neither page sets per-page `robots` metadata (unlike course / certificate / verify)
- [ ] Note the `cert_*` tables as IMPORT in the redesign transform docs

## Deferred by decision

- Resend email invites for seats — v1 is copy-links only.
- Recert = a new seat purchase; no renewal flow.

## Elsewhere

The original build plan (settled decisions, rationale) is at
`~/.claude/plans/mutable-singing-sun.md` — machine-local, not in this repo. The durable parts
of it are reproduced above.
