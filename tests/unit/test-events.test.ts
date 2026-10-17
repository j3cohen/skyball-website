import { describe, expect, it } from "vitest";
import { isTestEvent } from "@/lib/test-events";

describe("isTestEvent", () => {
  it("matches an upper-case TEST prefix only", () => {
    expect(isTestEvent("TEST SkyBall MN")).toBe(true);
    expect(isTestEvent("  TEST")).toBe(true);
    expect(isTestEvent("Test SkyBall MN")).toBe(false);
    expect(isTestEvent("Testing Open")).toBe(false);
    expect(isTestEvent("SkyBall MN TEST")).toBe(false);
    expect(isTestEvent(null)).toBe(false);
  });
});
