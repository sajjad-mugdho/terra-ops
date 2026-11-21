import { describe, expect, it } from "vitest";
import { addDays, formatDuration, formatUtc } from "./dates";

const at = (iso: string) => new Date(iso);

describe("formatUtc", () => {
  it("always shows UTC, whatever the machine time zone", () => {
    expect(formatUtc(at("2026-11-21T14:05:00Z"))).toBe("21 Nov 2026, 14:05 UTC");
    expect(formatUtc(at("2026-01-01T00:00:00+06:00"))).toBe("31 Dec 2025, 18:00 UTC");
  });
});

describe("formatDuration", () => {
  const from = at("2026-11-01T00:00:00Z");

  it.each([
    [0, "0m"],
    [59_000, "0m"],
    [5 * 60_000, "5m"],
    [65 * 60_000, "1h 5m"],
    [26 * 3_600_000, "1d 2h"],
    [48 * 3_600_000, "2d 0h"],
    [-5000, "0m"],
  ])("%i ms -> %s", (ms, text) => {
    expect(formatDuration(from, new Date(from.getTime() + ms))).toBe(text);
  });
});

describe("addDays", () => {
  it("adds whole days", () => {
    expect(addDays(at("2026-11-21T10:00:00Z"), 4).toISOString()).toBe("2026-11-25T10:00:00.000Z");
  });
});
