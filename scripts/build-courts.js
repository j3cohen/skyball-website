#!/usr/bin/env node
/**
 * Merges the court sources into the file the site serves.
 *
 *   public/data/courts-places-US.json   (npm run courts:fetch)
 *   public/data/courts-osm-US.json      (npm run courts:fetch:osm)
 *        -> public/data/courts-US.json  (what /play loads)
 *
 * Run: npm run courts:build
 *
 * The two sources see different things. Places knows named venues, with
 * addresses and phone numbers; OSM knows individual court polygons, including
 * the unnamed park courts Places has no listing for. Where they describe the
 * same place we keep the Places record — it reads better — but borrow OSM's
 * court count, which Places never has.
 */
const { readFile, writeFile } = require("node:fs/promises")
const path = require("node:path")

const DEDUPE_M = 150 // same venue if this close
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

async function load(dir, file) {
  try {
    const json = JSON.parse(await readFile(path.join(dir, file), "utf8"))
    return json.courts ?? []
  } catch {
    console.log(`  ${file}: not present, skipping`)
    return []
  }
}

// Buckets courts by rounded coordinate so dedupe is a handful of comparisons
// per court instead of 6k x 6k.
const CELL = 0.02 // ~2km
const cellKey = (lat, lng) => `${Math.round(lat / CELL)}:${Math.round(lng / CELL)}`
function neighbours(index, lat, lng) {
  const out = []
  const ci = Math.round(lat / CELL)
  const cj = Math.round(lng / CELL)
  for (let i = ci - 1; i <= ci + 1; i++) {
    for (let j = cj - 1; j <= cj + 1; j++) {
      const bucket = index.get(`${i}:${j}`)
      if (bucket) out.push(...bucket)
    }
  }
  return out
}

async function main() {
  const dir = path.resolve(__dirname, "../public/data")
  console.log("loading sources:")
  const places = await load(dir, "courts-places-US.json")
  const osm = await load(dir, "courts-osm-US.json")
  console.log(`  places: ${places.length}\n  osm:    ${osm.length}`)
  if (!places.length && !osm.length) throw new Error("no source data — run the fetch scripts first")

  const index = new Map()
  for (const c of places) {
    const k = cellKey(c.lat, c.lng)
    if (!index.has(k)) index.set(k, [])
    index.get(k).push(c)
  }

  const merged = [...places]
  let dropped = 0
  let enriched = 0
  for (const c of osm) {
    let match = null
    let best = Infinity
    for (const p of neighbours(index, c.lat, c.lng)) {
      const d = metersBetween(c, p)
      if (d < best) {
        best = d
        match = p
      }
    }
    if (match && best <= DEDUPE_M) {
      // Same venue: keep the Places record, take OSM's court count.
      if (c.courtCount && !match.courtCount) {
        match.courtCount = c.courtCount
        enriched++
      }
      dropped++
      continue
    }
    merged.push(c)
  }

  const sortKey = (n) => n.replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase()
  merged.sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)) || a.name.localeCompare(b.name))

  // OSM park courts often have no address/city/state. Empty strings across
  // ~9k records are pure payload, and every consumer already treats these as
  // optional, so drop them.
  for (const c of merged) {
    for (const k of ["address", "city", "state"]) if (c[k] === "") delete c[k]
  }

  const bySource = merged.reduce((m, c) => ((m[c.source] = (m[c.source] || 0) + 1), m), {})
  const file = {
    generatedAt: new Date().toISOString(),
    source: "google-places",
    sources: bySource,
    attribution: osm.length ? "Court data from Google Places and © OpenStreetMap contributors (ODbL)" : undefined,
    count: merged.length,
    courts: merged,
  }
  // Minified: this is a derived file served to browsers, not one to read by
  // hand. The per-source files stay pretty-printed for inspection.
  const outPath = path.join(dir, "courts-US.json")
  await writeFile(outPath, JSON.stringify(file) + "\n")
  console.log(
    `\nwrote ${outPath}` +
      `\n  ${merged.length} courts total` +
      `\n  ${dropped} OSM venues deduped against Places (${enriched} lent a court count)` +
      `\n  by source: ${JSON.stringify(bySource)}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
