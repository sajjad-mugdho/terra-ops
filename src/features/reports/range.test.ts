import { describe, expect, it } from "vitest";
import { defaultRange, parseDay, parseRange, rangeError } from "./range";

const NOW = new Date("2026-11-22T15:30:00.000Z");

describe("parseDay", () => {
  it("reads a day as UTC midnight", () => {
    expect(parseDay("2026-11-01")?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(parseDay("2028-02-29")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it.each([
    "2026-02-30",
    "2026-13-01",
    "2027-02-29",
    "2026-1-1",
    "01-11-2026",
    "2026-11-01T00:00:00Z",
    "yesterday",
    "",
    undefined,
    null,
    20261101,
    ["2026-11-01"],
  ])("refuses %j", (value) => {
    expect(parseDay(value)).toBeNull();
  });
});

describe("defaultRange", () => {
  it("covers the last 30 days up to the end of today, in UTC", () => {
    const range = defaultRange(NOW);
    expect(range.from).toBe("2026-10-23");
    expect(range.to).toBe("2026-11-22");
    expect(range.start.toISOString()).toBe("2026-10-23T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-11-23T00:00:00.000Z");
  });

  it("uses the UTC day, whatever the hour", () => {
    expect(defaultRange(new Date("2026-11-22T00:00:00.000Z")).to).toBe("2026-11-22");
    expect(defaultRange(new Date("2026-11-22T23:59:59.999Z")).to).toBe("2026-11-22");
  });
});

describe("parseRange", () => {
  it("makes the end date inclusive", () => {
    const range = parseRange("2026-11-01", "2026-11-10", NOW);
    expect(range).toMatchObject({ from: "2026-11-01", to: "2026-11-10" });
    expect(range.start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-11-11T00:00:00.000Z");
    expect(new Date("2026-11-10T23:59:59.999Z") < range.end).toBe(true);
  });

  it("accepts a single day", () => {
    const range = parseRange("2026-11-10", "2026-11-10", NOW);
    expect(range.end.getTime() - range.start.getTime()).toBe(86_400_000);
  });

  it("crosses a month and a year end", () => {
    const range = parseRange("2026-12-31", "2026-12-31", NOW);
    expect(range.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it.each([
    [undefined, undefined],
    ["2026-11-01", undefined],
    [undefined, "2026-11-10"],
    ["nope", "2026-11-10"],
    ["2026-11-01", "2026-02-30"],
    ["2026-11-10", "2026-11-01"],
    [["2026-11-01", "2026-11-02"], "2026-11-10"],
  ])("falls back to the default range for %j to %j", (from, to) => {
    expect(parseRange(from, to, NOW)).toEqual(defaultRange(NOW));
  });
});

describe("rangeError", () => {
  it("accepts a valid range", () => {
    expect(rangeError("2026-11-01", "2026-11-10")).toBeNull();
    expect(rangeError("2026-11-10", "2026-11-10")).toBeNull();
  });

  it("refuses a start date after the end date", () => {
    expect(rangeError("2026-11-10", "2026-11-01")).toBe(
      "The start date must be on or before the end date",
    );
  });

  it.each([
    ["", "2026-11-10"],
    ["2026-11-01", ""],
    ["2026-02-30", "2026-11-10"],
  ])("asks for both dates for %j to %j", (from, to) => {
    expect(rangeError(from, to)).toBe("Enter both dates as YYYY-MM-DD");
  });
});
