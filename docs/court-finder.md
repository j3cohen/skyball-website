# Court finder (/play)

The map at the top of `/play` shows public pickleball courts — SkyBall plays on
any of them. Courts are a **committed snapshot**, not a live API call: the page
reads `public/data/courts-US.json` (currently ~5,900 courts), so page loads cost
nothing in Google quota and the map still works if Google is down.

The snapshot is ~2.7 MB, far too much to inline into the page HTML, so the
browser fetches it as a static asset (`/data/courts-US.json`) that the CDN
compresses to roughly 440 KB and caches. That keeps the `/play` document itself
around 50 KB. Don't switch this back to a top-level `import` of the JSON — it
would land the whole dataset in the server-rendered HTML on every request.

## The two API keys — they are not interchangeable

| Key | Where it lives | Who can see it | Used by |
| --- | --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` | `.env.local` on your machine only | **nobody** — server-side only | `npm run courts:fetch` |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Vercel env vars + `.env.local` | **everyone** — it ships in the page | the map in the browser |

Anything prefixed `NEXT_PUBLIC_` is compiled into the JavaScript the browser
downloads. That is unavoidable for Google Maps JS — the browser has to send a
key — so the browser key is protected by *restrictions*, not by secrecy. The
fetch key is the one that must never be public, which is why it has no
`NEXT_PUBLIC_` prefix and is only ever read by a script you run locally.

**Do not use one key for both.** A referrer-restricted key can't run the fetch
script, and an unrestricted key pasted into the browser bundle can be lifted off
the page and billed to us.

## Creating the keys

In Google Cloud Console → *APIs & Services*, enable **Places API (New)** and
**Maps JavaScript API**, then create two keys under *Credentials*:

1. **Fetch key** → `GOOGLE_MAPS_API_KEY`
   - *API restrictions:* Places API (New) only.
   - *Application restrictions:* none needed (it runs from your laptop), or your
     home/office IP if you want belt and braces.
   - Put it in `.env.local`. That file is gitignored — never commit it, never
     paste the key into Slack, a PR, or a ticket.

2. **Browser key** → `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`
   - *API restrictions:* Maps JavaScript API only.
   - *Application restrictions:* HTTP referrers —
     `https://skyball.us/*`, `https://www.skyball.us/*`, and
     `https://*.vercel.app/*` if you want the map on preview deploys.
   - Add it in Vercel → Project → Settings → Environment Variables (Production,
     Preview, Development), and to `.env.local` for local work.

Finally set a **budget alert** in Google Cloud Billing. Restrictions stop abuse
from other sites; a budget alert is what tells you if something slips through.

## Refreshing the court data

```bash
npm run courts:fetch      # reads GOOGLE_MAPS_API_KEY from .env.local
```

This text-searches Places for pickleball courts around ~150 US cities (~345
billed requests, ~15 minutes) and rewrites `public/data/courts-US.json`. Commit
the regenerated file and deploy — that is what publishes new courts.

**Re-run it at least every 30 days.** That is not only for freshness: Google's
terms allow caching Places content only temporarily, with Place IDs the one
field you may store indefinitely. A monthly refresh keeps us inside that.

The run is resilient: transient Google 5xx/429 responses are retried with
backoff, a city that still fails is skipped rather than aborting the run, and
progress is checkpointed after every city so an interrupted run resumes instead
of re-paying for what it already fetched.

To top up one area without paying for all ~150 cities again:

```bash
ONLY="New Orleans,Austin" MERGE=1 npm run courts:fetch
```

`ONLY` limits the run to those cities (names must match `CITIES`); `MERGE=1`
folds results into the existing file instead of replacing it.

Coverage is "named places Google knows about": strong for facilities, clubs, and
signposted park courts, thinner for small unnamed neighbourhood courts. To
densify a region, add entries to the `CITIES` array in `scripts/fetch-courts.js`
(`{ name, state, lat, lon }`) and re-run.

## Data quality

Places answers "pickleball courts near X" with anything it considers related, so
the script filters results before they reach the site:

- `BLOCKED_PLACE_TYPES` drops places that are never the court itself — paddle
  shops, bars that host leagues, contractors who *build* courts, parks & rec
  offices, courthouses. This removed ~200 of 6,100 results. It is the main lever
  on quality: widen it if junk shows up, narrow it if something real vanishes.
- Border-city searches pull in Canadian results; anything whose address ends in
  a foreign country name is dropped. Puerto Rico is kept and normalised to `PR`.
- Coordinates are rounded to 5 decimal places (~1 m), which is plenty for a pin
  and a meaningful slice of the payload.

None of this is a judgement call you're stuck with — the lists live at the top of
`scripts/fetch-courts.js`.

## Without keys

Nothing breaks. With no browser key the map slot shows a short notice and the
searchable list, directions links, Google Maps links, and the demo-suggestion
mailto all keep working. With no fetch key the committed snapshot is simply
whatever was last committed.

## Visitor location

If the browser has already granted location permission, the map opens on the
visitor and their nearest courts, and the list sorts nearest-first with
distances. Otherwise nothing is requested until they press **Near me** — we
don't fire a permission dialog at someone the moment the page loads. Denial is
handled: the map just fits all courts.
