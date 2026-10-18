/**
 * Event calendar dates.
 *
 * `tournaments.start_date` is a plain Postgres DATE ("YYYY-MM-DD") with no time
 * zone. `new Date("2026-10-18")` parses as UTC midnight, which is the evening
 * BEFORE in every US time zone — so an event looked "past" (hidden behind the
 * "include past events" toggle, no Register button) from ~8pm ET the night
 * before and for the whole of its own day.
 *
 * Rule: an event is past only once its calendar date has ended in
 * EVENT_TIME_ZONE. Pacific is the last continental US zone to finish a date, so
 * a day-of event stays "upcoming" through the day everywhere in the US.
 */
export const EVENT_TIME_ZONE = "America/Los_Angeles"

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Today's calendar date ("YYYY-MM-DD") in the given time zone. */
export function todayInZone(now: Date = new Date(), timeZone: string = EVENT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

/**
 * Whether an event is over. A date-only value ("YYYY-MM-DD") is past once that
 * day has ended in EVENT_TIME_ZONE; a full timestamp is past once the instant
 * has passed. Unknown/blank values are treated as upcoming.
 */
export function isEventPast(start: string | null | undefined, now: Date = new Date()): boolean {
  if (!start) return false
  if (DATE_ONLY.test(start)) return start < todayInZone(now)
  const parsed = new Date(start)
  return !isNaN(parsed.getTime()) && parsed < now
}

/** "October 18, 2026" for a DATE string, without shifting the day by time zone. */
export function formatEventDate(start: string): string {
  const parsed = DATE_ONLY.test(start) ? new Date(`${start}T00:00:00Z`) : new Date(start)
  if (isNaN(parsed.getTime())) return start
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(DATE_ONLY.test(start) ? { timeZone: "UTC" } : {}),
  })
}
