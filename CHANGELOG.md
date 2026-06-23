# Changelog

## 2026-06-22 — SEO optimization, domain-switch prep, rules/equipment copy

### SEO & domain centralization
- Added `lib/seo.ts` with `SITE_URL` (overridable via `NEXT_PUBLIC_SITE_URL`, defaults to `https://skyball.us`), `OG_IMAGE`, and a `pageMetadata()` helper that emits canonical + Open Graph consistently.
- Refactored ~22 pages/layouts and the four dynamic `generateMetadata` routes (`products/[slug]`, `players/[id]`, `tournaments/[id]`, `past-tournaments/[id]`) onto `pageMetadata()`. Removed every hardcoded domain literal (only intentional privacy-policy body text remains).
- Future domain switch (skyball.us → skyballglobal.com) is now a single env-var change. See CLAUDE.md → "SEO Domain Switch".

### Fixes
- Fixed 5 `skyball.com` typos in JSON-LD/OG `url` fields (dashboard, login, partners, play/[id], giveaway-terms).
- `play/[id]` now uses dynamic `generateMetadata` (event name) instead of static "Event Details" with a `[id]` placeholder URL.
- `dashboard` and `login` are now `noindex, nofollow`.
- Most pages gained an OG image they previously lost (Next.js shallow-merges `openGraph`).
- Fixed deprecated `layout="fill"` → `fill` in `components/team-section.tsx`.

### SEO completeness
- Added `/conversion` and `/giveaway-terms` to `app/sitemap.ts`.
- Added a branded `app/not-found.tsx` (returns proper 404 status).

### Content / rules
- Renamed equipment references from "21-inch racquet/racket" to "Strung SkyBall Racquet/Racket" across FAQ, rules, what-is-skyball, and product data (new racket model is not 21").
- Updated the serve rule to the two-bounce rule (pickleball-style): both server and receiver must let the ball bounce once before either side may volley. Updated `rules-content.tsx` (Serving + Gameplay) and the "After the Serve" section in `how-to-play.tsx`.

### Removed
- Twitter/X metadata removed everywhere (no X account).

### Notes
- Twitter removed and OG retained; link previews still work on iMessage/Slack/Facebook/LinkedIn.
- `components/featured-products.tsx` is dead code (imported nowhere); left as-is. It links by `product.id` against the slug-based route, so wire it to Supabase slugs if it's ever reused.
- No infra/DNS/dashboard changes were made — domain stays on skyball.us.
