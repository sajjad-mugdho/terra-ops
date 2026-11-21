import { describe, expect, it } from "vitest";
import { centsToDollarText, formatMoney, parseDollarsToCents } from "./money";

describe("formatMoney", () => {
  it.each([
    [1250, "$12.50"],
    [5, "$0.05"],
    [0, "$0.00"],
    [-1500, "-$15.00"],
    [123456789, "$1,234,567.89"],
  ])("%i -> %s", (cents, text) => {
    expect(formatMoney(cents)).toBe(text);
  });
});

describe("parseDollarsToCents", () => {
  it.each([
    ["12.5", 1250],
    ["12.50", 1250],
    ["0", 0],
    ["  7 ", 700],
    ["0.07", 7],
    ["0.1", 10],
    ["0.29", 29],
    ["1000000", 100000000],
  ])("%s -> %i", (text, cents) => {
    expect(parseDollarsToCents(text)).toBe(cents);
  });

  it.each(["12.345", "-1", "abc", "", " ", "1e3", "1,000", "$5", ".5", "5.", "1.2.3"])(
    "rejects %j",
    (text) => {
      expect(parseDollarsToCents(text)).toBeNull();
    },
  );
});

describe("centsToDollarText", () => {
  it.each([
    [1250, "12.50"],
    [5, "0.05"],
    [0, "0.00"],
    [100000000, "1000000.00"],
  ])("%i -> %s", (cents, text) => {
    expect(centsToDollarText(cents)).toBe(text);
    expect(parseDollarsToCents(text)).toBe(cents);
  });
});
