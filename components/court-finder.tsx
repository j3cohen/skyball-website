"use client"

// components/court-finder.tsx
//
// Legacy port of the new-site court finder (React 18 / Tailwind 3, no shared
// UI package). Search + legend filters, Google map with kind-coloured pins,
// navy side panel (list or selected detail), bottom sheet on mobile. Without
// a browser key the map slot shows a notice and the list still works.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Crosshair, ExternalLink, MapPin, Navigation, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type CourtKind = "public" | "private" | "facility"
export type CourtSetting = "indoor" | "outdoor" | "unknown"

export type Court = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  city: string
  state: string
  kind: CourtKind
  setting: CourtSetting
  placeType: string
  googleMapsUri: string
  website?: string
  phone?: string
  source: string
}

export type CourtsFile = {
  generatedAt: string
  source: "google-places" | "placeholder"
  count: number
  courts: Court[]
}

const NAVY = "#01014c"
const CLUSTER_THRESHOLD = 200
const NEARBY_FIT_COUNT = 5
const KINDS: CourtKind[] = ["public", "private", "facility"]
const SETTINGS: CourtSetting[] = ["indoor", "outdoor"]

const KIND_LABELS: Record<CourtKind, string> = {
  public: "Public court",
  private: "Private / club",
  facility: "SkyBall facility",
}
const KIND_EYEBROWS: Record<CourtKind, string> = {
  public: "PUBLIC COURT",
  private: "PRIVATE",
  facility: "SKYBALL FACILITY",
}
const SETTING_LABELS: Record<CourtSetting, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  unknown: "Indoor/outdoor unknown",
}
const KIND_COLORS: Record<CourtKind, string> = {
  public: "#5de0e6",
  private: "#f59e0b",
  facility: "#22c55e",
}

const directionsUrl = (c: Court) =>
  `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`

const suggestMailto = (c: Court) =>
  `mailto:play@skyball.us?subject=${encodeURIComponent(`Court demo suggestion: ${c.name}`)}&body=${encodeURIComponent(c.address)}`

function humanizePlaceType(placeType: string): string {
  const s = placeType.replace(/_/g, " ").trim()
  return s ? s[0].toUpperCase() + s.slice(1) : "Unknown"
}

function pinIcon(kind: CourtKind, setting: CourtSetting, selected: boolean): google.maps.Icon {
  const fill = KIND_COLORS[kind]
  const size = selected ? 44 : 34
  const inner =
    setting === "indoor"
      ? `<circle cx="12" cy="10" r="4.5" fill="none" stroke="${NAVY}" stroke-width="2.2"/><circle cx="12" cy="10" r="1.6" fill="${NAVY}"/>`
      : `<circle cx="12" cy="10" r="3.5" fill="${NAVY}"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="${size}" height="${size * (32 / 24)}"><path d="M12 1C6.5 1 2.5 5.2 2.5 10.6 2.5 18 12 31 12 31s9.5-13 9.5-20.4C21.5 5.2 17.5 1 12 1z" fill="${fill}" stroke="${selected ? "#ffffff" : NAVY}" stroke-width="${selected ? 2 : 1.2}"/>${inner}</svg>`
  const h = size * (32 / 24)
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, h),
    anchor: new google.maps.Point(size / 2, h),
  }
}

// ---- Maps JS loader (once per page, no wrapper dependency) ----------------
type MapsStatus = "idle" | "loading" | "ready" | "error"
const SCRIPT_ID = "skyball-google-maps"
let loadPromise: Promise<void> | null = null

function loadMaps(key: string): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = new Promise<void>((resolve, reject) => {
    const finish = async () => {
      try {
        await google.maps.importLibrary("maps")
        await google.maps.importLibrary("marker")
        resolve()
      } catch (err) {
        reject(err)
      }
    }
    if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") {
      void finish()
      return
    }
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement("script")
    if (!existing) {
      script.id = SCRIPT_ID
      script.async = true
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=marker`
      document.head.appendChild(script)
    }
    script.addEventListener("load", () => void finish(), { once: true })
    script.addEventListener("error", () => reject(new Error("Maps script failed to load")), { once: true })
  }).catch((err) => {
    loadPromise = null
    throw err
  })
  return loadPromise
}

function useGoogleMaps(key: string | null): MapsStatus {
  const [status, setStatus] = useState<MapsStatus>(key ? "loading" : "idle")
  useEffect(() => {
    if (!key) return
    let cancelled = false
    loadMaps(key).then(
      () => !cancelled && setStatus("ready"),
      () => !cancelled && setStatus("error"),
    )
    return () => {
      cancelled = true
    }
  }, [key])
  return status
}

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return desktop
}

// ---- Visitor location -----------------------------------------------------
// "Open near me if we can" without nagging: if the browser already remembers a
// granted permission we locate silently on load, otherwise the visitor has to
// press "Near me" (which is what raises the browser prompt). Denial is not an
// error state — the map just falls back to fitting every court.
export type LatLng = { lat: number; lng: number }
type GeoStatus = "idle" | "locating" | "ready" | "denied" | "unsupported"

function useUserLocation() {
  const [coords, setCoords] = useState<LatLng | null>(null)
  const [status, setStatus] = useState<GeoStatus>("idle")

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported")
      return
    }
    setStatus("locating")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus("ready")
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  }, [])

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported")
      return
    }
    // Permissions API is unavailable in some browsers (older Safari); there we
    // simply wait for the button rather than firing an unprompted dialog.
    if (!navigator.permissions?.query) return
    let cancelled = false
    navigator.permissions
      .query({ name: "geolocation" })
      .then((res) => {
        if (!cancelled && res.state === "granted") locate()
      })
      .catch(() => {
        /* permission state unknowable — leave it to the button */
      })
    return () => {
      cancelled = true
    }
  }, [locate])

  return { coords, status, locate }
}

const EARTH_RADIUS_MI = 3958.8

function distanceMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(h))
}

const formatMiles = (mi: number) => (mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`)

// ---- Component ------------------------------------------------------------
const NO_COURTS: Court[] = []

export default function CourtFinder({
  courtsUrl,
  browserKey,
}: {
  courtsUrl: string
  browserKey: string | null
}) {
  const [query, setQuery] = useState("")
  const [kinds, setKinds] = useState<Set<CourtKind>>(() => new Set(KINDS))
  const [settings, setSettings] = useState<Set<CourtSetting>>(() => new Set(SETTINGS))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isDesktop = useIsDesktop()
  const { coords, status: geoStatus, locate } = useUserLocation()

  // The snapshot is a few thousand courts — far too much to inline into the
  // page HTML, so it loads as a static asset the CDN can compress and cache.
  const [file, setFile] = useState<CourtsFile | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetch(courtsUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`courts ${r.status}`)
        return r.json()
      })
      .then((f: CourtsFile) => {
        if (!cancelled) setFile(f)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [courtsUrl])

  const courts = file?.courts ?? NO_COURTS
  const snapshotSource = file?.source ?? "google-places"
  const loading = !file && !loadFailed

  // Only offer a kind filter the data can actually satisfy — with no partner
  // facilities in the snapshot, a "SkyBall facility" chip is a dead control.
  const availableKinds = useMemo(() => {
    const present = new Set(courts.map((c) => c.kind))
    return KINDS.filter((k) => present.has(k))
  }, [courts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = courts.filter((c) => {
      if (!kinds.has(c.kind)) return false
      if (c.setting === "unknown" ? settings.size === 0 : !settings.has(c.setting)) return false
      if (!q) return true
      return [c.name, c.city, c.state, c.address].some((s) => s?.toLowerCase().includes(q))
    })
    if (!coords) return matches
    return matches
      .map((c) => ({ c, d: distanceMiles(coords, { lat: c.lat, lng: c.lng }) }))
      .sort((a, b) => a.d - b.d)
      .map(({ c }) => c)
  }, [courts, query, kinds, settings, coords])

  const selected = selectedId ? courts.find((c) => c.id === selectedId) ?? null : null

  const toggle = <T,>(set: Set<T>, value: T, apply: (next: Set<T>) => void) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    apply(next)
  }

  const detail = selected && <CourtDetail court={selected} onClose={() => setSelectedId(null)} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="court-search">
          Search courts
        </label>
        <input
          id="court-search"
          type="search"
          placeholder="Search by name, city, or state"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 sm:max-w-md"
        />
        {geoStatus !== "unsupported" && (
          <button
            type="button"
            onClick={locate}
            disabled={geoStatus === "locating"}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-[#01014c] shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Crosshair aria-hidden className="h-4 w-4" />
            {geoStatus === "locating" ? "Locating…" : coords ? "Recenter on me" : "Near me"}
          </button>
        )}
        <p className="text-sm text-gray-600" aria-live="polite">
          {loading
            ? "Loading courts…"
            : loadFailed
              ? "Couldn't load the court list — please refresh."
              : filtered.length === courts.length
                ? `${courts.length.toLocaleString()} courts loaded`
                : `${filtered.length.toLocaleString()} of ${courts.length.toLocaleString()} courts`}
          {coords && filtered.length > 0 && <span className="text-gray-400"> · nearest first</span>}
        </p>
      </div>

      {geoStatus === "denied" && (
        <p className="text-xs text-gray-500">
          Location is off for this site, so we&apos;re showing every court. Search a city or state to narrow it down.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2" aria-label="Filter courts">
        {availableKinds.map((k) => (
          <Chip key={k} active={kinds.has(k)} color={KIND_COLORS[k]} onClick={() => toggle(kinds, k, setKinds)}>
            {KIND_LABELS[k]}
          </Chip>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-gray-300 sm:inline-block" aria-hidden />
        {SETTINGS.map((s) => (
          <Chip key={s} active={settings.has(s)} onClick={() => toggle(settings, s, setSettings)}>
            {SETTING_LABELS[s]}
          </Chip>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-gray-200 bg-white lg:min-h-[60vh]",
            // The fixed mobile height is for the map canvas; the keyless
            // fallback card sizes to its content instead of floating in a band.
            browserKey && "h-[55dvh] lg:h-auto",
          )}
        >
          <CourtMap
            courts={filtered}
            selectedId={selectedId}
            browserKey={browserKey}
            onSelect={setSelectedId}
            userLocation={coords}
          />
        </div>
        <aside
          className="hidden max-h-[75vh] flex-col overflow-hidden rounded-lg bg-[#01014c] text-white lg:flex lg:min-h-[60vh]"
          aria-label={selected ? "Court details" : "Court list"}
        >
          {detail ?? (
            <CourtList
              courts={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
              userLocation={coords}
              loading={loading}
            />
          )}
        </aside>
      </div>

      <div className="overflow-hidden rounded-lg bg-[#01014c] text-white lg:hidden">
        <CourtList
          courts={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          userLocation={coords}
          loading={loading}
        />
      </div>

      <p className="text-xs text-gray-500">
        Courts come from Google Places, refreshed periodically (not live). Coverage is strong for named
        facilities and clubs; some smaller park courts may not be listed yet.
        {snapshotSource === "placeholder" && (
          <> This list is a starter set — the full Places snapshot lands with the next refresh.</>
        )}
      </p>

      {!isDesktop && selected && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={selected.name}>
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setSelectedId(null)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl bg-[#01014c] text-white shadow-2xl">
            {detail}
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-gray-300 bg-white text-gray-900"
          : "border-dashed border-gray-300 text-gray-400 line-through",
      )}
    >
      {color && (
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color, opacity: active ? 1 : 0.4 }}
        />
      )}
      {children}
    </button>
  )
}

function CourtList({
  courts,
  selectedId,
  onSelect,
  userLocation,
  loading,
}: {
  courts: Court[]
  selectedId: string | null
  onSelect: (id: string) => void
  userLocation: LatLng | null
  loading: boolean
}) {
  if (loading) {
    return <div className="p-6 text-sm text-white/70">Loading courts…</div>
  }
  if (courts.length === 0) {
    return <div className="p-6 text-sm text-white/70">No courts match — try a different search or turn a filter back on.</div>
  }
  return (
    <ul className="max-h-[75vh] divide-y divide-white/10 overflow-y-auto">
      {courts.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onSelect(c.id)}
            aria-current={c.id === selectedId ? "true" : undefined}
            className={cn(
              "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/10",
              c.id === selectedId && "bg-white/10",
            )}
          >
            <span
              aria-hidden
              className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: KIND_COLORS[c.kind] }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.name}</span>
              <span className="block truncate text-xs text-white/60">
                {[c.city, c.state].filter(Boolean).join(", ")}
                {c.setting !== "unknown" ? ` · ${SETTING_LABELS[c.setting]}` : ""}
              </span>
            </span>
            {userLocation && (
              <span className="mt-0.5 shrink-0 text-xs tabular-nums text-white/50">
                {formatMiles(distanceMiles(userLocation, { lat: c.lat, lng: c.lng }))}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

function CourtDetail({ court, onClose }: { court: Court; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: KIND_COLORS[court.kind] }}>
            {KIND_EYEBROWS[court.kind]}
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight">{court.name}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-white/70">
            <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{court.address}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="rounded-md border border-white/15 bg-white/5 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Type</p>
        <p className="mt-1 text-sm">
          {SETTING_LABELS[court.setting]} · {humanizePlaceType(court.placeType)}
        </p>
        {(court.website || court.phone) && (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {court.website && (
              <a
                href={court.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#5de0e6] hover:underline"
              >
                Website <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </a>
            )}
            {court.phone && (
              <a href={`tel:${court.phone}`} className="text-[#5de0e6] hover:underline">
                {court.phone}
              </a>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={directionsUrl(court)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-sky-500 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-400"
        >
          <Navigation aria-hidden className="h-4 w-4" />
          Get directions
        </a>
        <a
          href={court.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/30 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          View full listing on Google Maps
          <ExternalLink aria-hidden className="h-4 w-4" />
        </a>
        <a
          href={suggestMailto(court)}
          className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-[#5de0e6] transition-colors hover:bg-white/10"
        >
          Suggest this court for a SkyBall demo
        </a>
      </div>
    </div>
  )
}

type Clusterer = {
  clearMarkers: () => void
  addMarkers: (m: google.maps.Marker[]) => void
  setMap: (m: google.maps.Map | null) => void
}

function CourtMap({
  courts,
  selectedId,
  browserKey,
  onSelect,
  userLocation,
}: {
  courts: Court[]
  selectedId: string | null
  browserKey: string | null
  onSelect: (id: string) => void
  userLocation: LatLng | null
}) {
  const status = useGoogleMaps(browserKey)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const clustererRef = useRef<Clusterer | null>(null)
  const youMarkerRef = useRef<google.maps.Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (status !== "ready" || !containerRef.current || mapRef.current) return
    mapRef.current = new google.maps.Map(containerRef.current, {
      center: { lat: 39.5, lng: -98.35 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "greedy",
      backgroundColor: NAVY,
    })
  }, [status])

  useEffect(() => {
    const map = mapRef.current
    if (status !== "ready" || !map) return
    let cancelled = false

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current.clear()
    clustererRef.current?.clearMarkers()

    const markers = courts.map((c) => {
      const marker = new google.maps.Marker({
        position: { lat: c.lat, lng: c.lng },
        title: c.name,
        icon: pinIcon(c.kind, c.setting, c.id === selectedId),
        zIndex: c.id === selectedId ? 1000 : undefined,
      })
      marker.addListener("click", () => onSelectRef.current(c.id))
      markersRef.current.set(c.id, marker)
      return marker
    })

    if (courts.length > CLUSTER_THRESHOLD) {
      void import("@googlemaps/markerclusterer").then(({ MarkerClusterer }) => {
        if (cancelled) return
        clustererRef.current ??= new MarkerClusterer({ map })
        clustererRef.current.setMap(map)
        clustererRef.current.addMarkers(markers)
      })
    } else {
      clustererRef.current?.setMap(null)
      markers.forEach((m) => m.setMap(map))
    }

    if (courts.length > 0 && !selectedId) {
      const bounds = new google.maps.LatLngBounds()
      if (userLocation) {
        // Open on the visitor's surroundings instead of the whole country:
        // their position plus the handful of closest courts (the list is
        // already distance-sorted by this point).
        bounds.extend(userLocation)
        courts.slice(0, NEARBY_FIT_COUNT).forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }))
      } else {
        courts.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }))
      }
      map.fitBounds(bounds, 48)
      if (courts.length === 1) map.setZoom(13)
      if (userLocation) {
        // A court across the street would otherwise fit to street level.
        google.maps.event.addListenerOnce(map, "idle", () => {
          if ((map.getZoom() ?? 0) > 14) map.setZoom(14)
        })
      }
    }
    return () => {
      cancelled = true
    }
    // selectedId is applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, courts, userLocation])

  // "You are here" dot, kept out of the court marker lifecycle above.
  useEffect(() => {
    const map = mapRef.current
    if (status !== "ready" || !map) return
    if (!userLocation) {
      youMarkerRef.current?.setMap(null)
      youMarkerRef.current = null
      return
    }
    youMarkerRef.current ??= new google.maps.Marker({
      title: "Your location",
      clickable: false,
      zIndex: 1,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2.5,
      },
    })
    youMarkerRef.current.setPosition(userLocation)
    youMarkerRef.current.setMap(map)
  }, [status, userLocation])

  useEffect(() => {
    const map = mapRef.current
    if (status !== "ready" || !map) return
    markersRef.current.forEach((m, id) => {
      const c = courts.find((x) => x.id === id)
      if (c) {
        m.setIcon(pinIcon(c.kind, c.setting, id === selectedId))
        m.setZIndex(id === selectedId ? 1000 : undefined)
      }
    })
    const sel = selectedId ? courts.find((c) => c.id === selectedId) : null
    if (sel) {
      map.panTo({ lat: sel.lat, lng: sel.lng })
      if ((map.getZoom() ?? 0) < 12) map.setZoom(13)
    }
  }, [status, selectedId, courts])

  if (!browserKey || status === "error") {
    return (
      <div className="flex justify-center p-4 lg:min-h-[inherit] lg:items-center">
        <div className="flex w-full max-w-md flex-col items-center rounded-lg border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <MapPin className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-lg font-semibold text-[#01014c]">
            {browserKey ? "Map couldn't load" : "Map view is on its way"}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            {browserKey
              ? "Google Maps didn't respond. Refresh in a moment, or use the list to get directions."
              : "Pick a court from the list for directions."}
          </p>
          {!browserKey && process.env.NODE_ENV !== "production" && (
            <p className="mt-2 break-all text-xs text-gray-400">
              Dev: set NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY in .env.local to show the map.
            </p>
          )}
        </div>
      </div>
    )
  }
  return (
    <>
      <div ref={containerRef} className="h-full w-full" role="region" aria-label="Court map" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-gray-600">
          Loading map…
        </div>
      )}
    </>
  )
}
