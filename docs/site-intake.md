# Site Intake — build notes & handoff

skyball.us's public intake forms used to fire a Telegram message and store nothing. A lead
that exists only as a chat message is a lead we lose. As of commit `07bec18` (2026-08-14,
branch `dev`) every intake form also writes a row to the **website** Supabase project.
Telegram behaviour is otherwise unchanged.

**Status:** feature-complete on `dev`, build clean, 74 tests passing. Not yet verified on a
deployed URL — see [Before launch](#before-launch--open-items).

---

## Why the schema is not ours to change

skyball.us is being replaced by a rebuilt platform on a consolidated database. That
rebuild's schema for these forms already exists as `skyball-backend` migration
`0026_site_intake.sql`. At cutover an ETL copies these rows across, and the job of this
build is to make that copy a straight column-for-column move.

`supabase/migrations/20260814_site_intake.sql` mirrors `0026` with exactly two deltas, both
noted inline in the file: `country_code` is a CHECK rather than an FK to a `countries`
table that does not exist here, and `set_updated_at()` is created here because this project
lacks it.

**Do not add columns.** No `utm_source`, no `ip_address`, no `notes`, no `synced_at`. An
extra column is a column the ETL has to reconcile. Same for admin UI, unsubscribe links,
double opt-in, consent columns, and campaign sending — all owned by the rebuild.

---

## Where the data goes

The **website** project `cnhxpeadrylpssryywsd` — the one the shop and orders already use,
reached through `lib/server/supabaseAdmin.ts`. Not the mobile project.

### `public.notification_signups`

Notification-signup AND newsletter forms. **One live row per `(lower(email), country_code)`
— repeat signups merge.**

```
id uuid pk | name text NOT NULL | email text NOT NULL | phone text NULL
country_code text NOT NULL (^[A-Z]{2}$) | locality text NOT NULL
notification_types text[] NOT NULL  -- >=1, subset of:
    open_play | tournaments | pop_ups | special_events | newsletter
source text NOT NULL                -- notification_form | newsletter_form
created_at, updated_at timestamptz   -- updated_at via trigger
```

### `public.site_inquiries`

Info-request forms. Append-only, one row per submission, no dedupe.

```
id uuid pk | kind text NOT NULL     -- school | host | where_to_play | general
name text NOT NULL | email text NULL | phone text NULL   -- CHECK: at least one
message text NULL | locality text NULL | country_code text NOT NULL
details jsonb NULL                  -- always {subject}, plus {schoolInfo} on /skyball-for-schools
created_at timestamptz
```

Note `locality` is **nullable in the schema** but **required by every form** — that is a
product rule, not a schema rule. See [Required fields](#required-fields-and-why-they-differ).

---

## Rules that must not be broken

These are enforced in code and asserted in `tests/integration/site-intake.test.ts`. If you
change any of them, change the tests deliberately — don't delete them.

1. **Signup writes go through the RPC, never a direct insert.**
   `upsert_notification_signup(p_name, p_email, p_country_code, p_locality, p_types,
   p_source, p_phone)` owns the merge: signing up again with the same email in the same
   country unions the notification types onto the existing row and refreshes
   name/locality/phone. Do not reimplement that in application code. There is no
   `.from("notification_signups")` anywhere in the app, by design.

2. **Inquiries are a plain insert.** One row per submission.

3. **`country_code` and `source` are set server-side, never from the request body.**
   `COUNTRY_CODE = "US"` is a constant in `lib/server/siteIntake.ts`; `source` is a literal
   at each call site. skyball.us is US-only; in the rebuild the country comes from the
   URL's country section, and this hardcode is the equivalent. Do not add a country field
   to a form, accept one in the body, or infer it from IP or locale.

4. **Order of operations: DB write first, then the Telegram ping.**
   A **DB failure fails the request** — the user sees an error and can retry, because a
   silent success that stored nothing is the bug this work exists to fix. A **Telegram
   failure never fails the request** — it is caught and logged. (This changed behaviour for
   the info-request and newsletter forms, which used to show the user an error when
   Telegram failed.)

5. **Service role only.** Both tables are RLS-enabled with **zero policies** (deny-all) and
   explicitly revoked from `anon`/`authenticated`, because they hold PII and this legacy
   project auto-exposes new tables to the Data API. Every write happens in a server action
   using `supabaseAdmin`. Never the anon key, never a client component.

6. **Email casing is preserved.** The unique index is on `lower(email)`; we store what the
   user typed. Trim, never lowercase.

7. **The investor deck gate (`/deck`) stays Telegram-only.** It is a download gate, not a
   signup. No row.

---

## The forms

Six user-facing forms across four components on eight pages. All six write to the DB; all
six carry a honeypot.

| Form | Component | Page(s) | Table |
|---|---|---|---|
| Notification signup | `components/play-events.tsx` | `/play` | `notification_signups`, `source='notification_form'` |
| Newsletter | `components/contact.tsx` | `/` (`#contact`) | `notification_signups`, `source='newsletter_form'`, `types=['newsletter']` |
| Info request | `components/info-request-form.tsx` | `/become-a-host`, `/skyball-for-schools`, `/faq`, `/shop` | `site_inquiries` |
| General dialog | `components/contact-form-dialog.tsx` | `/partners`, `/about` | `site_inquiries`, `kind='general'` |

Server actions: `app/actions/open-play-notifications.ts`, `app/actions/subscription.ts`,
`app/actions/info-request.ts`. All three follow the same shape — honeypot → throttle →
validate → DB write → Telegram.

### `subject` → `kind`

`InfoRequestForm` takes a free-text `subject` prop, but `site_inquiries.kind` is a CHECK
constraint. The map lives in `app/actions/info-request.ts`:

```
"School Information Request" -> school
"Host Information Request"   -> host
"Where can I play?"          -> where_to_play
"General Information Request"-> general
<anything else>              -> general      // original kept in details.subject
```

**The fallback is load-bearing.** `/shop` renders `subject="Product Inquiry"`, which is not
in the constraint — without the fallback that insert fails on a live page. Any new subject
you add is safe by default and lands as `general` with the original preserved in
`details.subject`.

### Required fields, and why they differ

This looks inconsistent until you look at the columns.

- **Signup forms** require name, email, and City-or-ZIP because all three are `NOT NULL` on
  `notification_signups`. The `/play` form previously accepted email *or* phone; phone-only
  signups cannot be stored, so email is now required there.
- **Inquiry forms** require name (`NOT NULL`) and satisfy `email IS NOT NULL OR phone IS
  NOT NULL` with a zod refine, so neither contact field alone is HTML-required.
- **City or ZIP is required on all six forms**, which is stricter than `site_inquiries`
  demands. That is a deliberate product choice — a lead without a location is hard to act
  on regionally. To relax it on the inquiry forms: change `location: localitySchema` back to
  `z.string().optional()` in `app/actions/info-request.ts` and drop the `required`
  attribute. The column is nullable, so nothing downstream cares.

Locality is stored as **raw free text**. Do not parse it, split it into state/postal
columns, or validate it against a list. `localitySchema` in `lib/validations.ts` is the
single definition, shared by both actions.

---

## Abuse protection

These are public unauthenticated endpoints that write PII. Protection is proportionate on
purpose — this is an interim measure on a site being retired.

- **Honeypot**: a hidden `name="website"` input on every form. Filled → the action returns
  the normal success message and writes nothing. Checked *before* the throttle, so bots
  don't consume a real user's budget.
- **Per-IP throttle**: 10 per 60s, buckets `signup` and `inquiry`, via `rateLimit()` in
  `lib/server/rateLimiter.ts`. Server actions have no `Request` object, so the IP comes from
  `headers()` rather than `rateLimitResponse()`. **In-memory and per-instance** — on Vercel
  each function instance counts separately, so it blunts a script hammering one endpoint but
  is not a hard global cap.

---

## Testing

```
npm test               # unit, no services
npm run test:integration   # needs the local stack; gated on LOCAL_SUPABASE=1
npm run test:all
```

`tests/integration/site-intake.test.ts` drives the **real server actions**, because the
invariants that matter live in the actions, not the table definitions. It covers: RLS
deny-all for reads and writes, server-set `country_code`/`source` (it injects
`country_code=ZZ, source=newsletter_form` into the FormData and asserts they are ignored),
the RPC merge producing one row with a unioned type array, the `subject`→`kind` map
including the fallback, locality required on every subject, honeypot, and the throttle.

`tests/setup.ts` deletes `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`, so the whole integration
suite runs with Telegram deliberately broken — which is exactly the "Telegram failure never
fails the request" check.

### Local stack

The website project has **no staging**. `scripts/local-db/setup.sh` builds a local Docker
clone (ports 5434x) and applies `20260814_site_intake.sql` at step 4b, guarded by a
`to_regclass` check because the migration is verbatim-from-prod and has no `IF NOT EXISTS`.
It is deliberately **not** in the certguard schema-diff lists — that guard exists to prove
the *cert* migration is additive and must keep its current inputs.

`scripts/local-db/env-mode.sh local|prod` swaps `.env.local`. **In LOCAL mode `npm run dev`
writes to `127.0.0.1:54341`, not to the Supabase dashboard** — the single most likely reason
a submission "doesn't show up".

---

## Before launch — open items

- Not yet exercised on a deployed URL. Because the website project has no staging, a Vercel
  preview writes to the **production** tables; test rows will need deleting.
- Preview/production env must have `SUPABASE_SERVICE_ROLE_KEY` set to the prod website key,
  and `NEXT_PUBLIC_WEBSITE_SUPABASE_URL` / `_ANON_KEY` **unset** (they are local-testing
  overrides; set, they point a deploy at `127.0.0.1`).
- No live Telegram message was sent from a test run. No message-building code changed —
  verified by diff — but a real send is unconfirmed.
- `/shop`'s "Product Inquiry" is the weakest case for a required City-or-ZIP. If
  submissions drop there, that is the one to relax first.

---

## Not in scope, and why

- **Admin UI, exports, unsubscribe, double opt-in, consent columns, campaign sending** —
  owned by the rebuild. Building them here creates migration conflicts.
- **`/play/[id]/register` (free and free-50)** — these look Telegram-only if you trace only
  the Telegram call, but both call `saveFreeEntry`, which inserts into `tournament_entries`
  on the **mobile** project for guests and signed-in users alike. They already persist; the
  Telegram ping is a best-effort extra. Leave them alone.
- **Tournament cancellation** (`components/registered-tournaments.tsx`) and
  **certification purchase** (`lib/server/certFulfill.ts`) — transaction alerts, not intake.
- **Dead code**: `app/actions/event-registration-static.ts` and
  `app/actions/registration-telegram.ts` have zero importers. `app/actions/contact.ts` is a
  stub that only logs and is not what `components/contact.tsx` calls. Don't wire them up.

## Elsewhere

- `docs/coaching-certification.md` — the other feature on this DB, same local-stack setup
- `CLAUDE.md` — project conventions
