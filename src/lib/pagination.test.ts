import { describe, expect, it } from "vitest";
import { PAGE_SIZE, pageHref, pageWindow, parsePage } from "./pagination";

describe("parsePage", () => {
  it.each([
    ["1", 1],
    ["2", 2],
    ["37", 37],
    ["007", 7],
  ])("reads %s as page %i", (value, page) => {
    expect(parsePage(value)).toBe(page);
  });

  it.each([
    ["0"],
    ["-3"],
    ["abc"],
    [""],
    [" 2"],
    ["2 "],
    ["1.5"],
    ["2abc"],
    ["1e3"],
    ["+2"],
    ["NaN"],
    ["Infinity"],
  ])("treats %j as page 1", (value) => {
    expect(parsePage(value)).toBe(1);
  });

  it.each([[undefined], [null], [3], [["2", "3"]], [{}]])("treats the non-text value %j as page 1", (value) => {
    expect(parsePage(value)).toBe(1);
  });

  it("keeps a huge number finite, so the window can clamp it", () => {
    const page = parsePage("9".repeat(400));
    expect(Number.isFinite(page)).toBe(true);
    expect(pageWindow(page, 45).page).toBe(3);
  });
});

describe("pageWindow", () => {
  it("uses 20 rows per page", () => {
    expect(PAGE_SIZE).toBe(20);
  });

  it.each([
    [0, 1],
    [1, 1],
    [19, 1],
    [20, 1],
    [21, 2],
    [40, 2],
    [41, 3],
    [400, 20],
  ])("has for %i rows %i page(s)", (total, pageCount) => {
    expect(pageWindow(1, total).pageCount).toBe(pageCount);
  });

  it.each([
    [1, 0],
    [2, 20],
    [3, 40],
  ])("starts page %i at offset %i", (page, offset) => {
    expect(pageWindow(page, 100)).toEqual({ page, pageCount: 5, offset, limit: 20 });
  });

  it("shows the last page for a page past the end", () => {
    expect(pageWindow(999, 21)).toEqual({ page: 2, pageCount: 2, offset: 20, limit: 20 });
    expect(pageWindow(Number.POSITIVE_INFINITY, 21).page).toBe(2);
  });

  it("shows page 1 of an empty list", () => {
    expect(pageWindow(5, 0)).toEqual({ page: 1, pageCount: 1, offset: 0, limit: 20 });
  });

  it.each([[0], [-3], [Number.NaN], [0.4]])("treats the page %d as page 1", (page) => {
    expect(pageWindow(page, 100).page).toBe(1);
  });

  it("cuts a fraction off the page", () => {
    expect(pageWindow(2.9, 100).page).toBe(2);
  });

  it("covers every row once across the pages", () => {
    const total = 53;
    const seen: number[] = [];
    for (let page = 1; page <= pageWindow(1, total).pageCount; page++) {
      const { offset, limit } = pageWindow(page, total);
      for (let row = offset; row < Math.min(offset + limit, total); row++) seen.push(row);
    }
    expect(seen).toEqual(Array.from({ length: total }, (_, index) => index));
  });
});

describe("pageHref", () => {
  it("leaves page 1 out of the URL", () => {
    expect(pageHref("/customer/orders", {}, 1)).toBe("/customer/orders");
  });

  it("adds the page", () => {
    expect(pageHref("/customer/orders", {}, 3)).toBe("/customer/orders?page=3");
  });

  it("keeps the filters and drops the empty ones", () => {
    expect(pageHref("/admiral/orders", { q: "ord-1", status: "PLACED", planet: undefined, sort: "" }, 2)).toBe(
      "/admiral/orders?q=ord-1&status=PLACED&page=2",
    );
  });

  it("encodes the search text", () => {
    expect(pageHref("/manager/orders", { q: "a&b=c d%" }, 1)).toBe("/manager/orders?q=a%26b%3Dc+d%25");
  });
});
