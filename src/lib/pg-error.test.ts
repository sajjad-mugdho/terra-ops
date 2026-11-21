import { describe, expect, it } from "vitest";
import { CHECK_VIOLATION, isPgError, UNIQUE_VIOLATION } from "./pg-error";

describe("isPgError", () => {
  it("finds the code on the error itself", () => {
    expect(isPgError({ code: UNIQUE_VIOLATION }, UNIQUE_VIOLATION)).toBe(true);
  });

  it("finds the code on the cause", () => {
    const error = new Error("Failed query", { cause: { code: CHECK_VIOLATION, constraint: "x" } });
    expect(isPgError(error, CHECK_VIOLATION)).toBe(true);
    expect(isPgError(error, CHECK_VIOLATION, "x")).toBe(true);
    expect(isPgError(error, CHECK_VIOLATION, "y")).toBe(false);
  });

  it("is false for another code and for things that are not errors", () => {
    expect(isPgError({ code: UNIQUE_VIOLATION }, CHECK_VIOLATION)).toBe(false);
    expect(isPgError(new Error("plain"), UNIQUE_VIOLATION)).toBe(false);
    expect(isPgError(null, UNIQUE_VIOLATION)).toBe(false);
  });
});
