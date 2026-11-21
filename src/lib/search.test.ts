import { describe, expect, it } from "vitest";
import { likePattern, parseSearch } from "./search";

describe("parseSearch", () => {
  it("keeps normal text", () => {
    expect(parseSearch("ORD-12")).toBe("ORD-12");
  });

  it("trims the text", () => {
    expect(parseSearch("  ada  ")).toBe("ada");
  });

  it.each([[""], [" "], ["   \t\n "]])("treats %j as no search", (value) => {
    expect(parseSearch(value)).toBeUndefined();
  });

  it.each([[undefined], [null], [12], [["a", "b"]], [{}]])("treats the non-text value %j as no search", (value) => {
    expect(parseSearch(value)).toBeUndefined();
  });

  it("cuts very long text at 100 characters", () => {
    expect(parseSearch("x".repeat(100))).toHaveLength(100);
    expect(parseSearch("x".repeat(101))).toHaveLength(100);
    expect(parseSearch("x".repeat(5000))).toHaveLength(100);
  });

  it("counts the 100 characters after trimming", () => {
    expect(parseSearch(`   ${"y".repeat(100)}   `)).toBe("y".repeat(100));
  });

  it("leaves no space at the cut", () => {
    expect(parseSearch(`${"z".repeat(99)} tail`)).toBe("z".repeat(99));
  });

  it("keeps quotes and SQL as plain text", () => {
    expect(parseSearch("'; drop table orders; --")).toBe("'; drop table orders; --");
  });
});

describe("likePattern", () => {
  it("wraps the text for a contains search", () => {
    expect(likePattern("ord-1")).toBe("%ord-1%");
  });

  it("escapes the wildcards and the escape character", () => {
    expect(likePattern("50%")).toBe("%50\\%%");
    expect(likePattern("a_b")).toBe("%a\\_b%");
    expect(likePattern("a\\b")).toBe("%a\\\\b%");
  });
});
