import { describe, expect, it } from "vitest";
import { formatEventDate, isEventPast, todayInZone } from "@/lib/event-dates";

describe("isEventPast — DATE values", () => {
  // 2026-10-18T01:44Z = Oct 17, 6:44pm Pacific / 9:44pm Eastern.
  const eveningBefore = new Date("2026-10-18T01:44:00Z");
  // 2026-10-18T23:30Z = Oct 18, 4:30pm Pacific.
  const dayOf = new Date("2026-10-18T23:30:00Z");
  // 2026-10-19T05:00Z = Oct 18, 10pm Pacific (already Oct 19 in UTC and Eastern).
  const lateDayOf = new Date("2026-10-19T05:00:00Z");
  // 2026-10-19T08:00Z = Oct 19, 1am Pacific.
  const dayAfter = new Date("2026-10-19T08:00:00Z");

  it("keeps a day-of event upcoming the evening before (the old UTC-midnight bug)", () => {
    expect(isEventPast("2026-10-18", eveningBefore)).toBe(false);
  });

  it("keeps a day-of event upcoming for its whole calendar day", () => {
    expect(isEventPast("2026-10-18", dayOf)).toBe(false);
    expect(isEventPast("2026-10-18", lateDayOf)).toBe(false);
  });

  it("marks the event past once the date has ended in Pacific time", () => {
    expect(isEventPast("2026-10-18", dayAfter)).toBe(true);
    expect(isEventPast("2026-10-16", eveningBefore)).toBe(true);
  });

  it("treats blank values as upcoming", () => {
    expect(isEventPast(null, dayOf)).toBe(false);
    expect(isEventPast("", dayOf)).toBe(false);
  });
});

describe("isEventPast — timestamps", () => {
  it("compares full timestamps as instants", () => {
    const now = new Date("2026-10-18T12:00:00Z");
    expect(isEventPast("2026-10-18T11:59:00Z", now)).toBe(true);
    expect(isEventPast("2026-10-18T12:01:00Z", now)).toBe(false);
  });
});

describe("todayInZone / formatEventDate", () => {
  it("returns the calendar date in the event time zone", () => {
    expect(todayInZone(new Date("2026-10-18T01:44:00Z"))).toBe("2026-10-17");
    expect(todayInZone(new Date("2026-10-18T08:00:00Z"))).toBe("2026-10-18");
  });

  it("formats a DATE without shifting the day", () => {
    expect(formatEventDate("2026-10-18")).toBe("October 18, 2026");
  });
});
