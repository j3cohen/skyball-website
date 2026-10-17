/**
 * Rehearsal events. A tournament whose name starts with `TEST` (upper-case,
 * after trimming) is a host dry run on the live database so the real event
 * can be verified end to end. Public lists drop it; a direct link still opens.
 * Same rule as the mobile/web app (skyball-app `lib/tournament-display.ts`).
 */
export const TEST_EVENT_PREFIX = "TEST"

export function isTestEvent(name: string | null | undefined): boolean {
  return (name ?? "").trimStart().startsWith(TEST_EVENT_PREFIX)
}
