// lib/analytics.ts
// Lightweight client-side GA4 event helpers. Safe to call anywhere: they no-op
// on the server and before gtag has loaded (matching the pattern in
// hooks/use-page-tracking.ts, which reads window.gtag via a loose cast).

type RegisterClickParams = {
  /** Where the click happened, e.g. "play_list", "event_detail", "register_page". */
  location: string
  /** Tournament / open-play event id, when known. */
  eventId?: string
  /** Human-readable event name, when known. */
  eventName?: string
  /** How registration proceeds: site flow vs. an external payment link. */
  method?: "internal" | "external" | "guest"
}

/**
 * Fires a GA4 `register_click` event. View counts/breakdowns in GA4 under
 * Reports → Engagement → Events (or build an exploration on the event params
 * `click_location`, `event_name`, `method`).
 */
export function trackRegisterClick({ location, eventId, eventName, method }: RegisterClickParams) {
  if (typeof window === "undefined") return
  // gtag's global type is narrowly declared in components/google-analytics.tsx;
  // read it loosely (as hooks/use-page-tracking.ts does) to send a custom event.
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag !== "function") return

  gtag("event", "register_click", {
    click_location: location,
    event_id: eventId,
    // GA4 reserves the top-level `event_name`; namespace ours to avoid clashes.
    skyball_event_name: eventName,
    method,
  })
}
