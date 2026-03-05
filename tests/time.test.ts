import { describe, expect, it } from "vitest";
import { addDays, isDateWithinRange, isValidDateString, isValidTimeString } from "@/lib/time";

describe("time helpers", () => {
  it("adds days correctly", () => {
    expect(addDays("2026-03-05", 30)).toBe("2026-04-04");
  });

  it("checks date range boundaries", () => {
    expect(isDateWithinRange("2026-03-05", "2026-03-05", "2026-04-04")).toBe(true);
    expect(isDateWithinRange("2026-04-05", "2026-03-05", "2026-04-04")).toBe(false);
  });

  it("validates date and time strings", () => {
    expect(isValidDateString("2026-03-05")).toBe(true);
    expect(isValidDateString("03-05-2026")).toBe(false);
    expect(isValidTimeString("09:20")).toBe(true);
    expect(isValidTimeString("9:20")).toBe(false);
  });
});
