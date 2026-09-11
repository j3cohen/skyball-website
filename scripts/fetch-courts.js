#!/usr/bin/env node
/**
 * Court finder data fetch (legacy site) — regenerates public/data/courts-US.json
 * from Google Places API (New) text search. Plain-JS copy of the new site's
 * apps/site/scripts/fetch-courts.ts.
 *
 * Run:   npm run courts:fetch            (reads .env.local via --env-file)
 *   or:  GOOGLE_MAPS_API_KEY=... node scripts/fetch-courts.js
 * Env:   GOOGLE_MAPS_API_KEY (Places API (New) enabled), optional COUNTRIES=US
 *
 * Coverage is "named places Google knows about" — strong for facilities and
 * clubs; smaller park courts can be missing. Add cities below for denser
 * coverage anywhere.
 */
const { mkdir, writeFile } = require("node:fs/promises")
const path = require("node:path")

// Major US cities/metro centers, roughly covering every state. This is a
// starting list, not exhaustive — add more entries (same {name, state, lat,
// lon} shape) for any region you want denser coverage in, especially smaller
// cities/suburbs where pickleball has taken off.
const CITIES = [
  { name: 'New York', state: 'NY', lat: 40.7128, lon: -74.0060 }, { name: 'Buffalo', state: 'NY', lat: 42.8864, lon: -78.8784 }, { name: 'Rochester', state: 'NY', lat: 43.1566, lon: -77.6088 }, { name: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 }, { name: 'San Diego', state: 'CA', lat: 32.7157, lon: -117.1611 }, { name: 'San Francisco', state: 'CA', lat: 37.7749, lon: -122.4194 }, { name: 'San Jose', state: 'CA', lat: 37.3382, lon: -121.8863 }, { name: 'Sacramento', state: 'CA', lat: 38.5816, lon: -121.4944 }, { name: 'Fresno', state: 'CA', lat: 36.7378, lon: -119.7871 }, { name: 'Palm Springs', state: 'CA', lat: 33.8303, lon: -116.5453 }, { name: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 }, { name: 'Peoria', state: 'IL', lat: 40.6936, lon: -89.5890 }, { name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 }, { name: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970 }, { name: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431 }, { name: 'San Antonio', state: 'TX', lat: 29.4241, lon: -98.4936 }, { name: 'Fort Worth', state: 'TX', lat: 32.7555, lon: -97.3308 }, { name: 'El Paso', state: 'TX', lat: 31.7619, lon: -106.4850 }, { name: 'McAllen', state: 'TX', lat: 26.2034, lon: -98.2300 }, { name: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 }, { name: 'Scottsdale', state: 'AZ', lat: 33.4942, lon: -111.9261 }, { name: 'Tucson', state: 'AZ', lat: 32.2226, lon: -110.9747 }, { name: 'Mesa', state: 'AZ', lat: 33.4152, lon: -111.8315 }, { name: 'Philadelphia', state: 'PA', lat: 39.9526, lon: -75.1652 }, { name: 'Pittsburgh', state: 'PA', lat: 40.4406, lon: -79.9959 }, { name: 'Allentown', state: 'PA', lat: 40.6084, lon: -75.4902 }, { name: 'Jacksonville', state: 'FL', lat: 30.3322, lon: -81.6557 }, { name: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 }, { name: 'Tampa', state: 'FL', lat: 27.9506, lon: -82.4572 }, { name: 'Orlando', state: 'FL', lat: 28.5383, lon: -81.3792 }, { name: 'St. Petersburg', state: 'FL', lat: 27.7676, lon: -82.6403 }, { name: 'Fort Myers', state: 'FL', lat: 26.6406, lon: -81.8723 }, { name: 'Sarasota', state: 'FL', lat: 27.3364, lon: -82.5307 }, { name: 'Naples', state: 'FL', lat: 26.1420, lon: -81.7948 }, { name: 'West Palm Beach', state: 'FL', lat: 26.7153, lon: -80.0534 }, { name: 'Tallahassee', state: 'FL', lat: 30.4383, lon: -84.2807 }, { name: 'The Villages', state: 'FL', lat: 28.9005, lon: -81.9873 }, { name: 'Columbus', state: 'OH', lat: 39.9612, lon: -82.9988 }, { name: 'Cleveland', state: 'OH', lat: 41.4993, lon: -81.6944 }, { name: 'Cincinnati', state: 'OH', lat: 39.1031, lon: -84.5120 }, { name: 'Toledo', state: 'OH', lat: 41.6528, lon: -83.5379 }, { name: 'Atlanta', state: 'GA', lat: 33.7490, lon: -84.3880 }, { name: 'Savannah', state: 'GA', lat: 32.0809, lon: -81.0912 }, { name: 'Augusta', state: 'GA', lat: 33.4735, lon: -82.0105 }, { name: 'Charlotte', state: 'NC', lat: 35.2271, lon: -80.8431 }, { name: 'Raleigh', state: 'NC', lat: 35.7796, lon: -78.6382 }, { name: 'Greensboro', state: 'NC', lat: 36.0726, lon: -79.7920 }, { name: 'Asheville', state: 'NC', lat: 35.5951, lon: -82.5515 }, { name: 'Wilmington', state: 'NC', lat: 34.2257, lon: -77.9447 }, { name: 'Charleston', state: 'SC', lat: 32.7765, lon: -79.9311 }, { name: 'Columbia', state: 'SC', lat: 34.0007, lon: -81.0348 }, { name: 'Myrtle Beach', state: 'SC', lat: 33.6891, lon: -78.8867 }, { name: 'Greenville', state: 'SC', lat: 34.8526, lon: -82.3940 }, { name: 'Ann Arbor', state: 'MI', lat: 42.2808, lon: -83.7430 }, { name: 'Detroit', state: 'MI', lat: 42.3314, lon: -83.0458 }, { name: 'Grand Rapids', state: 'MI', lat: 42.9634, lon: -85.6681 }, { name: 'Traverse City', state: 'MI', lat: 44.7631, lon: -85.6206 }, { name: 'Minneapolis', state: 'MN', lat: 44.9778, lon: -93.2650 }, { name: 'Rochester', state: 'MN', lat: 44.0121, lon: -92.4802 }, { name: 'Duluth', state: 'MN', lat: 46.7867, lon: -92.1005 }, { name: 'Milwaukee', state: 'WI', lat: 43.0389, lon: -87.9065 }, { name: 'Madison', state: 'WI', lat: 43.0731, lon: -89.4012 }, { name: 'Green Bay', state: 'WI', lat: 44.5133, lon: -88.0133 }, { name: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 }, { name: 'Colorado Springs', state: 'CO', lat: 38.8339, lon: -104.8214 }, { name: 'Boulder', state: 'CO', lat: 40.0150, lon: -105.2705 }, { name: 'Fort Collins', state: 'CO', lat: 40.5853, lon: -105.0844 }, { name: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321 }, { name: 'Spokane', state: 'WA', lat: 47.6588, lon: -117.4260 }, { name: 'Tacoma', state: 'WA', lat: 47.2529, lon: -122.4443 }, { name: 'Bellevue', state: 'WA', lat: 47.6101, lon: -122.2015 }, { name: 'Portland', state: 'OR', lat: 45.5152, lon: -122.6784 }, { name: 'Bend', state: 'OR', lat: 44.0582, lon: -121.3153 }, { name: 'Eugene', state: 'OR', lat: 44.0521, lon: -123.0868 }, { name: 'Boston', state: 'MA', lat: 42.3601, lon: -71.0589 }, { name: 'Worcester', state: 'MA', lat: 42.2626, lon: -71.8023 }, { name: 'Cape Cod', state: 'MA', lat: 41.6688, lon: -70.2962 }, { name: 'Providence', state: 'RI', lat: 41.8240, lon: -71.4128 }, { name: 'Hartford', state: 'CT', lat: 41.7658, lon: -72.6734 }, { name: 'Stamford', state: 'CT', lat: 41.0534, lon: -73.5387 }, { name: 'Portland', state: 'ME', lat: 43.6591, lon: -70.2568 }, { name: 'Manchester', state: 'NH', lat: 42.9956, lon: -71.4548 }, { name: 'Burlington', state: 'VT', lat: 44.4759, lon: -73.2121 }, { name: 'Newark', state: 'NJ', lat: 40.7357, lon: -74.1724 }, { name: 'Jersey City', state: 'NJ', lat: 40.7178, lon: -74.0431 }, { name: 'Atlantic City', state: 'NJ', lat: 39.3643, lon: -74.4229 }, { name: 'Princeton', state: 'NJ', lat: 40.3573, lon: -74.6672 }, { name: 'Wilmington', state: 'DE', lat: 39.7447, lon: -75.5466 }, { name: 'Baltimore', state: 'MD', lat: 39.2904, lon: -76.6122 }, { name: 'Annapolis', state: 'MD', lat: 38.9784, lon: -76.4922 }, { name: 'Rockville', state: 'MD', lat: 39.0840, lon: -77.1528 }, { name: 'Washington', state: 'DC', lat: 38.9072, lon: -77.0369 }, { name: 'Richmond', state: 'VA', lat: 37.5407, lon: -77.4360 }, { name: 'Virginia Beach', state: 'VA', lat: 36.8529, lon: -75.9780 }, { name: 'Arlington', state: 'VA', lat: 38.8816, lon: -77.0910 }, { name: 'Charlottesville', state: 'VA', lat: 38.0293, lon: -78.4767 }, { name: 'Charleston', state: 'WV', lat: 38.3498, lon: -81.6326 }, { name: 'Nashville', state: 'TN', lat: 36.1627, lon: -86.7816 }, { name: 'Knoxville', state: 'TN', lat: 35.9606, lon: -83.9207 }, { name: 'Memphis', state: 'TN', lat: 35.1495, lon: -90.0490 }, { name: 'Chattanooga', state: 'TN', lat: 35.0456, lon: -85.3097 }, { name: 'Louisville', state: 'KY', lat: 38.2527, lon: -85.7585 }, { name: 'Lexington', state: 'KY', lat: 38.0406, lon: -84.5037 }, { name: 'Indianapolis', state: 'IN', lat: 39.7684, lon: -86.1581 }, { name: 'Fort Wayne', state: 'IN', lat: 41.0793, lon: -85.1394 }, { name: 'Birmingham', state: 'AL', lat: 33.5186, lon: -86.8104 }, { name: 'Huntsville', state: 'AL', lat: 34.7304, lon: -86.5861 }, { name: 'Mobile', state: 'AL', lat: 30.6954, lon: -88.0399 }, { name: 'Jackson', state: 'MS', lat: 32.2988, lon: -90.1848 }, { name: 'Gulfport', state: 'MS', lat: 30.3674, lon: -89.0928 }, { name: 'New Orleans', state: 'LA', lat: 29.9511, lon: -90.0715 }, { name: 'Baton Rouge', state: 'LA', lat: 30.4515, lon: -91.1871 }, { name: 'Lafayette', state: 'LA', lat: 30.2241, lon: -92.0198 }, { name: 'Little Rock', state: 'AR', lat: 34.7465, lon: -92.2896 }, { name: 'Fayetteville', state: 'AR', lat: 36.0626, lon: -94.1574 }, { name: 'Oklahoma City', state: 'OK', lat: 35.4676, lon: -97.5164 }, { name: 'Tulsa', state: 'OK', lat: 36.1540, lon: -95.9928 }, { name: 'Kansas City', state: 'MO', lat: 39.0997, lon: -94.5786 }, { name: 'St. Louis', state: 'MO', lat: 38.6270, lon: -90.1994 }, { name: 'Springfield', state: 'MO', lat: 37.2090, lon: -93.2923 }, { name: 'Omaha', state: 'NE', lat: 41.2565, lon: -95.9345 }, { name: 'Lincoln', state: 'NE', lat: 40.8136, lon: -96.7026 }, { name: 'Des Moines', state: 'IA', lat: 41.5868, lon: -93.6250 }, { name: 'Cedar Rapids', state: 'IA', lat: 41.9779, lon: -91.6656 }, { name: 'Wichita', state: 'KS', lat: 37.6872, lon: -97.3301 }, { name: 'Kansas City', state: 'KS', lat: 39.1155, lon: -94.6268 }, { name: 'Sioux Falls', state: 'SD', lat: 43.5460, lon: -96.7313 }, { name: 'Fargo', state: 'ND', lat: 46.8772, lon: -96.7898 }, { name: 'Billings', state: 'MT', lat: 45.7833, lon: -108.5007 }, { name: 'Bozeman', state: 'MT', lat: 45.6770, lon: -111.0429 }, { name: 'Boise', state: 'ID', lat: 43.6150, lon: -116.2023 }, { name: "Coeur d'Alene", state: 'ID', lat: 47.6777, lon: -116.7805 }, { name: 'Cheyenne', state: 'WY', lat: 41.1400, lon: -104.8202 }, { name: 'Jackson Hole', state: 'WY', lat: 43.4799, lon: -110.7624 }, { name: 'Salt Lake City', state: 'UT', lat: 40.7608, lon: -111.8910 }, { name: 'St. George', state: 'UT', lat: 37.0965, lon: -113.5684 }, { name: 'Provo', state: 'UT', lat: 40.2338, lon: -111.6585 }, { name: 'Las Vegas', state: 'NV', lat: 36.1699, lon: -115.1398 }, { name: 'Reno', state: 'NV', lat: 39.5296, lon: -119.8138 }, { name: 'Albuquerque', state: 'NM', lat: 35.0844, lon: -106.6504 }, { name: 'Santa Fe', state: 'NM', lat: 35.6870, lon: -105.9378 }, { name: 'Las Cruces', state: 'NM', lat: 32.3199, lon: -106.7637 }, { name: 'Anchorage', state: 'AK', lat: 61.2181, lon: -149.9003 }, { name: 'Fairbanks', state: 'AK', lat: 64.8378, lon: -147.7164 }, { name: 'Honolulu', state: 'HI', lat: 21.3069, lon: -157.8583 }, { name: 'Kailua-Kona', state: 'HI', lat: 19.6400, lon: -155.9969 }, { name: 'San Juan', state: 'PR', lat: 18.4655, lon: -66.1057 },
];

const CITIES_BY_COUNTRY = { US: CITIES }
const COUNTRY_NAMES = { US: ["USA", "United States"] }
const DEFAULT_RADIUS_M = 40000
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.businessStatus,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber,nextPageToken"

let requestCount = 0

async function searchCity(apiKey, cc, city) {
  const out = []
  let pageToken
  do {
    requestCount++
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: `pickleball courts near ${city.name}, ${city.state}`,
        regionCode: cc,
        pageSize: 20,
        locationBias: {
          circle: { center: { latitude: city.lat, longitude: city.lon }, radius: city.radius ?? DEFAULT_RADIUS_M },
        },
        ...(pageToken ? { pageToken } : {}),
      }),
    })
    if (!res.ok) throw new Error(`Places request failed (${res.status}) for ${city.name}: ${await res.text()}`)
    const json = await res.json()
    out.push(...(json.places ?? []))
    pageToken = json.nextPageToken
    if (pageToken) await new Promise((r) => setTimeout(r, 1500))
  } while (pageToken)
  return out
}

function classifyKind(place) {
  const types = place.types ?? []
  const name = place.displayName?.text ?? ""
  if (types.some((t) => t.includes("park") || t.includes("school"))) return "public"
  if (
    types.some((t) => ["gym", "sports_club", "country_club", "fitness_center"].includes(t)) ||
    /\b(club|athletic|racquet|YMCA|fitness)\b/i.test(name)
  )
    return "private"
  return "public"
}

function classifySetting(place) {
  const hay = [...(place.types ?? []), place.primaryType ?? "", place.displayName?.text ?? ""].join(" ").toLowerCase()
  if (/\b(indoor|gym|arena)\b/.test(hay)) return "indoor"
  if (/\b(park|field|playground)\b/.test(hay)) return "outdoor"
  return "unknown"
}

function cityState(address, cc, fallback) {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean)
  const countryNames = COUNTRY_NAMES[cc] ?? []
  if (parts.length && countryNames.includes(parts[parts.length - 1])) parts.pop()
  if (parts.length < 2) return { city: fallback.name, state: fallback.state }
  const stateRaw = parts[parts.length - 1].replace(/\d+/g, "").trim()
  const cityRaw = parts[parts.length - 2].replace(/^\d+\s*/, "").trim()
  const state = stateRaw || fallback.state
  const city = parts.length >= 3 && !/^\d/.test(parts[parts.length - 2]) ? cityRaw : fallback.name
  return { city, state }
}

function toCourt(place, cc, city) {
  if (!place.id || !place.location || !place.displayName?.text || !place.formattedAddress) return null
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") return null
  const loc = cityState(place.formattedAddress, cc, city)
  const court = {
    id: place.id,
    name: place.displayName.text,
    address: place.formattedAddress,
    lat: place.location.latitude,
    lng: place.location.longitude,
    city: loc.city,
    state: loc.state,
    kind: classifyKind(place),
    setting: classifySetting(place),
    placeType: place.primaryType ?? place.types?.[0] ?? "unknown",
    googleMapsUri:
      place.googleMapsUri ??
      `https://www.google.com/maps/search/?api=1&query=${place.location.latitude},${place.location.longitude}`,
    source: "google-places",
  }
  if (place.websiteUri) court.website = place.websiteUri
  if (place.nationalPhoneNumber) court.phone = place.nationalPhoneNumber
  return court
}

async function fetchCountry(apiKey, cc, outDir) {
  const cities = CITIES_BY_COUNTRY[cc]
  if (!cities) throw new Error(`No city list for ${cc} — add one to CITIES_BY_COUNTRY`)
  const byId = new Map()
  for (const city of cities) {
    const places = await searchCity(apiKey, cc, city)
    let added = 0
    for (const p of places) {
      const court = toCourt(p, cc, city)
      if (court && !byId.has(court.id)) {
        byId.set(court.id, court)
        added++
      }
    }
    console.log(`${cc} ${city.name}, ${city.state}: ${places.length} results, ${added} new`)
  }
  const courts = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  const file = { generatedAt: new Date().toISOString(), source: "google-places", count: courts.length, courts }
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, `courts-${cc}.json`)
  await writeFile(outPath, JSON.stringify(file, null, 2) + "\n")
  console.log(`wrote ${outPath} (${courts.length} courts)`)
}

async function main() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error("GOOGLE_MAPS_API_KEY is not set (Places API (New) key). Aborting.")
    process.exit(1)
  }
  const list = (process.env.COUNTRIES ?? process.env.CC ?? "US").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
  const outDir = path.resolve(__dirname, "../public/data")
  for (const cc of list) await fetchCountry(apiKey, cc, outDir)
  console.log(`done — ${requestCount} Places requests`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
