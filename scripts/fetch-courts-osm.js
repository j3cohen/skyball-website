#!/usr/bin/env node
/**
 * Court finder data fetch — OpenStreetMap source.
 *
 * Writes public/data/courts-osm-US.json. Complements the Google Places source:
 * Places only knows *named places*, so a park with pickleball lines and no
 * listing is invisible to it. OSM has those, tagged sport=pickleball.
 *
 * Run:   npm run courts:fetch:osm
 * Env:   OSM_BBOX="s,w,n,e" to limit to one region (handy for testing)
 *
 * No API key and no billing — Overpass is free. In exchange we keep the request
 * count low, back off on errors, and identify ourselves in the user agent.
 *
 * OSM tags individual courts, not venues: a park with six pickleball courts is
 * six `leisure=pitch` ways. We cluster anything within CLUSTER_M into one pin
 * and record how many courts it holds, otherwise dense parks become a pile of
 * overlapping markers.
 *
 * Data is ODbL — attribution is required wherever it is shown.
 */
const { mkdir, readFile, rm, writeFile } = require("node:fs/promises")
const path = require("node:path")

const ENDPOINT = "https://overpass-api.de/api/interpreter"
const USER_AGENT = "skyball-court-finder/1.0 (https://skyball.us; courts data refresh)"
const CLUSTER_M = 90 // courts closer than this are one venue
const NAME_RADIUS_M = 120 // how far to look for a name to borrow
const POLITE_DELAY_MS = 1500
const MAX_ATTEMPTS = 3
const REQUEST_TIMEOUT_MS = 180000
const MIN_BOX_DEG = 0.5 // stop subdividing here; below this a timeout is real
const GRID_DEG = 5 // regions are pre-split to this before querying

// Start coarse and subdivide only where Overpass struggles.
const REGIONS = [
  { name: "US-west", s: 31, w: -125, n: 49, e: -109 },
  { name: "US-mountain", s: 31, w: -109, n: 49, e: -97 },
  { name: "US-central", s: 25, w: -97, n: 49, e: -87 },
  { name: "US-east", s: 24, w: -87, n: 48, e: -66 },
  { name: "Alaska", s: 51, w: -170, n: 72, e: -129 },
  { name: "Hawaii", s: 18, w: -161, n: 23, e: -154 },
  { name: "Puerto Rico", s: 17.8, w: -67.5, n: 18.6, e: -65.2 },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const EARTH_R_M = 6371000

function metersBetween(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat))
  return 2 * EARTH_R_M * Math.asin(Math.sqrt(h))
}

// One query returns both the courts and any named feature within
// NAME_RADIUS_M of one — `around.courts` keeps the naming set tiny instead of
// pulling every named park in the box.
const query = (box) => `[out:json][timeout:180];
nwr["sport"~"pickleball",i](${box.s},${box.w},${box.n},${box.e})->.courts;
.courts out center tags;
(
  way(around.courts:${NAME_RADIUS_M})["name"]["leisure"];
  relation(around.courts:${NAME_RADIUS_M})["name"]["leisure"];
  way(around.courts:${NAME_RADIUS_M})["name"]["amenity"];
)->.named;
.named out bb tags;`

let requestCount = 0

async function overpass(box, label) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    requestCount++
    let res
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": USER_AGENT,
        },
        body: "data=" + encodeURIComponent(query(box)),
        // Without this, undici's own body timeout kills a slow response with an
        // opaque "terminated" and we can't tell it apart from a real failure.
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        // A box Overpass can't stream in time is a box that needs splitting,
        // not another identical attempt.
        const wrapped = new Error(`Overpass request failed for ${label}: ${err.message}`)
        wrapped.tooBig = true
        throw wrapped
      }
      console.log(`  ${label}: ${err.message}, retrying (attempt ${attempt}/${MAX_ATTEMPTS})`)
      await sleep(POLITE_DELAY_MS * 2 ** attempt)
      continue
    }
    if (res.ok) {
      try {
        return await res.json()
      } catch (err) {
        // The abort timeout fires during the body read too, not just the
        // request — this has to be handled here or it escapes the retry loop.
        if (attempt === MAX_ATTEMPTS) {
          const wrapped = new Error(`Overpass body read failed for ${label}: ${err.message}`)
          wrapped.tooBig = true
          throw wrapped
        }
        console.log(`  ${label}: ${err.message} reading body, retrying (attempt ${attempt}/${MAX_ATTEMPTS})`)
        await sleep(POLITE_DELAY_MS * 2 ** attempt)
        continue
      }
    }
    // 429 = rate limited, 504 = query too big for the server's patience.
    const retryable = res.status === 429 || res.status === 502 || res.status === 504
    const body = (await res.text()).slice(0, 200)
    if (!retryable) throw new Error(`Overpass ${res.status} for ${label}: ${body}`)
    if (attempt === MAX_ATTEMPTS) {
      const err = new Error(`Overpass ${res.status} for ${label} after ${MAX_ATTEMPTS} attempts`)
      err.tooBig = true
      throw err
    }
    console.log(`  ${label}: ${res.status}, backing off (attempt ${attempt}/${MAX_ATTEMPTS})`)
    await sleep(POLITE_DELAY_MS * 3 * attempt)
  }
  throw new Error("unreachable")
}

// Split a box that Overpass won't serve, rather than losing the region.
async function collect(box, label, out) {
  let json
  try {
    json = await overpass(box, label)
  } catch (err) {
    const height = box.n - box.s
    const width = box.e - box.w
    if (!err.tooBig || Math.max(height, width) <= MIN_BOX_DEG) throw err
    const midLat = (box.s + box.n) / 2
    const midLng = (box.w + box.e) / 2
    console.log(`  ${label}: too big, splitting into 4`)
    await collect({ s: box.s, w: box.w, n: midLat, e: midLng }, `${label}.sw`, out)
    await sleep(POLITE_DELAY_MS)
    await collect({ s: box.s, w: midLng, n: midLat, e: box.e }, `${label}.se`, out)
    await sleep(POLITE_DELAY_MS)
    await collect({ s: midLat, w: box.w, n: box.n, e: midLng }, `${label}.nw`, out)
    await sleep(POLITE_DELAY_MS)
    await collect({ s: midLat, w: midLng, n: box.n, e: box.e }, `${label}.ne`, out)
    return
  }

  let courts = 0
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {}
    const isCourt = /pickleball/i.test(tags.sport ?? "")
    const pos = el.type === "node" ? { lat: el.lat, lng: el.lon } : el.center ? { lat: el.center.lat, lng: el.center.lon } : null
    if (isCourt && pos) {
      const key = `${el.type}/${el.id}`
      if (!out.courts.has(key)) {
        out.courts.set(key, { key, ...pos, tags })
        courts++
      }
    }
    // `out bb` gives a bounding box; the smallest one containing a cluster is
    // the most specific name available (the sports centre, not the whole park).
    if (el.bounds && tags.name) {
      const key = `${el.type}/${el.id}`
      if (!out.named.has(key)) out.named.set(key, { name: tags.name, tags, bounds: el.bounds })
    }
  }
  console.log(`  ${label}: ${courts} new courts, ${(json.elements ?? []).length} elements`)
}

// Greedy single-link clustering: walk each court's unvisited neighbours within
// CLUSTER_M. Fine at this scale and keeps a row of eight courts as one venue.
function clusterCourts(courts) {
  const list = [...courts.values()]
  const seen = new Set()
  const clusters = []
  for (const start of list) {
    if (seen.has(start.key)) continue
    const group = [start]
    seen.add(start.key)
    const queue = [start]
    while (queue.length) {
      const cur = queue.pop()
      for (const other of list) {
        if (seen.has(other.key)) continue
        if (metersBetween(cur, other) <= CLUSTER_M) {
          seen.add(other.key)
          group.push(other)
          queue.push(other)
        }
      }
    }
    clusters.push(group)
  }
  return clusters
}

const boundsArea = (b) => Math.abs(b.maxlat - b.minlat) * Math.abs(b.maxlon - b.minlon)
const inBounds = (p, b) =>
  p.lat >= b.minlat && p.lat <= b.maxlat && p.lng >= b.minlon && p.lng <= b.maxlon
const boundsCenter = (b) => ({ lat: (b.minlat + b.maxlat) / 2, lng: (b.minlon + b.maxlon) / 2 })

// Prefer the smallest feature actually containing the courts; failing that, the
// closest named feature nearby — a court just outside a park's mapped outline
// is still better described as "that park" than as nothing.
function bestName(centroid, named) {
  const containing = [...named.values()].filter((n) => inBounds(centroid, n.bounds))
  if (containing.length) {
    containing.sort((a, b) => boundsArea(a.bounds) - boundsArea(b.bounds))
    return containing[0]
  }
  let best = null
  let bestDist = Infinity
  for (const n of named.values()) {
    const d = metersBetween(centroid, boundsCenter(n.bounds))
    if (d < bestDist && d <= NAME_RADIUS_M) {
      bestDist = d
      best = n
    }
  }
  return best
}

const PRIVATE_ACCESS = new Set(["private", "members", "customers", "permit"])
const CLUB_RE = /\b(club|athletic|racquet|racket|ymca|fitness|academy|country club)\b/i

function toCourt(group, named) {
  const lat = group.reduce((s, c) => s + c.lat, 0) / group.length
  const lng = group.reduce((s, c) => s + c.lng, 0) / group.length
  const centroid = { lat, lng }

  // Prefer a name the courts carry themselves, else borrow the most specific
  // enclosing named feature, else say plainly what it is.
  // Individual courts are sometimes tagged with just their court number
  // ("1", "Court 2"). That is not a venue name — fall through to the
  // enclosing park instead, or these sort to the top of an A-Z list.
  const isCourtNumber = (n) => /^(court\s*)?[0-9]{1,3}[a-z]?$/i.test(n.trim())
  const ownName = group.map((c) => c.tags.name).find((n) => n && !isCourtNumber(n))
  const borrowed = ownName ? null : bestName(centroid, named)
  const venueTags = borrowed?.tags ?? {}
  const name = ownName ?? (borrowed ? `Pickleball courts — ${borrowed.name}` : "Pickleball courts")

  const tagsList = group.map((c) => c.tags)
  const isPrivate =
    tagsList.some((t) => PRIVATE_ACCESS.has(t.access)) ||
    PRIVATE_ACCESS.has(venueTags.access) ||
    CLUB_RE.test(ownName ?? borrowed?.name ?? "") ||
    venueTags.leisure === "sports_centre"
  const indoor = tagsList.some((t) => t.indoor === "yes" || t.covered === "yes" || t.building)
  const outdoor = tagsList.some((t) => t.leisure === "pitch")

  const addr = [
    venueTags["addr:housenumber"] && venueTags["addr:street"]
      ? `${venueTags["addr:housenumber"]} ${venueTags["addr:street"]}`
      : venueTags["addr:street"],
    venueTags["addr:city"],
    venueTags["addr:state"],
  ]
    .filter(Boolean)
    .join(", ")

  const court = {
    // Stable across runs: the first OSM element in the cluster.
    id: `osm-${group[0].key.replace("/", "-")}`,
    name,
    address: addr,
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    city: venueTags["addr:city"] ?? "",
    state: venueTags["addr:state"] ?? "",
    kind: isPrivate ? "private" : "public",
    setting: indoor ? "indoor" : outdoor ? "outdoor" : "unknown",
    placeType: venueTags.leisure ?? venueTags.amenity ?? "pitch",
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    source: "openstreetmap",
    courtCount: group.length,
  }
  const website = venueTags.website ?? venueTags["contact:website"]
  if (website && /^https?:\/\//.test(website)) court.website = website
  const phone = venueTags.phone ?? venueTags["contact:phone"]
  if (phone) court.phone = phone
  return court
}

async function main() {
  const out = { courts: new Map(), named: new Map() }
  const custom = process.env.OSM_BBOX
  const regions = custom
    ? [
        (() => {
          const [s, w, n, e] = custom.split(",").map(Number)
          if ([s, w, n, e].some(Number.isNaN)) throw new Error(`OSM_BBOX must be "s,w,n,e"`)
          return { name: "custom", s, w, n, e }
        })(),
      ]
    : REGIONS

  // Overpass streams a continent-sized box too slowly to be reliable, so walk
  // a grid of modest boxes. Adaptive subdivision then handles the dense ones.
  const boxes = []
  for (const region of regions) {
    for (let s0 = region.s; s0 < region.n; s0 += GRID_DEG) {
      for (let w0 = region.w; w0 < region.e; w0 += GRID_DEG) {
        boxes.push({
          name: `${region.name} ${s0.toFixed(0)},${w0.toFixed(0)}`,
          s: s0,
          w: w0,
          n: Math.min(s0 + GRID_DEG, region.n),
          e: Math.min(w0 + GRID_DEG, region.e),
        })
      }
    }
  }
  console.log(`${boxes.length} boxes to sweep\n`)

  const outDirEarly = path.resolve(__dirname, "../public/data")
  await mkdir(outDirEarly, { recursive: true })
  const checkpointPath = path.join(outDirEarly, ".courts-osm.checkpoint.json")
  const doneBoxes = new Set()
  try {
    const cp = JSON.parse(await readFile(checkpointPath, "utf8"))
    for (const name of cp.doneBoxes ?? []) doneBoxes.add(name)
    for (const [k, v] of Object.entries(cp.courts ?? {})) out.courts.set(k, v)
    for (const [k, v] of Object.entries(cp.named ?? {})) out.named.set(k, v)
    if (doneBoxes.size) {
      console.log(`resuming: ${doneBoxes.size} boxes already swept, ${out.courts.size} courts held\n`)
    }
  } catch {
    /* no checkpoint — fresh sweep */
  }

  let done = 0
  for (const box of boxes) {
    done++
    if (doneBoxes.has(box.name)) continue
    await collect(box, box.name, out)
    doneBoxes.add(box.name)
    await writeFile(
      checkpointPath,
      JSON.stringify({
        doneBoxes: [...doneBoxes],
        courts: Object.fromEntries(out.courts),
        named: Object.fromEntries(out.named),
      }),
    )
    if (done % 10 === 0) console.log(`  ...${done}/${boxes.length} boxes, ${out.courts.size} courts so far`)
    await sleep(POLITE_DELAY_MS)
  }

  const clusters = clusterCourts(out.courts)
  const courts = clusters
    .map((g) => toCourt(g, out.named))
    .sort((a, b) => a.name.localeCompare(b.name))

  const outDir = outDirEarly
  const outPath = path.join(outDir, "courts-osm-US.json")
  await writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "openstreetmap",
        attribution: "© OpenStreetMap contributors, ODbL",
        count: courts.length,
        courts,
      },
      null,
      2,
    ) + "\n",
  )
  await rm(checkpointPath, { force: true })
  const named = courts.filter((c) => c.name !== "Pickleball courts").length
  console.log(
    `\nwrote ${outPath}\n  ${out.courts.size} OSM court elements -> ${courts.length} venues` +
      `\n  ${named} named (${Math.round((named / Math.max(courts.length, 1)) * 100)}%)` +
      `\n  ${requestCount} Overpass requests (free)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
