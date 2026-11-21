import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toActionResult } from "./action-result";
import { AppError, type ErrorCode } from "./errors";

describe("toActionResult", () => {
  it.each<[ErrorCode, string]>([
    ["UNAUTHORIZED", "Please log in again"],
    ["FORBIDDEN", "Not allowed"],
    ["NOT_FOUND", "Not found"],
    ["CONFLICT", "Something changed. Please try again"],
    ["INVALID", "Please check your input"],
  ])("maps %s to its default message", (code, message) => {
    expect(toActionResult(new AppError(code))).toEqual({ ok: false, error: message });
  });

  it("keeps a specific message", () => {
    const error = new AppError("CONFLICT", "This order was just taken by another captain");
    expect(toActionResult(error)).toEqual({ ok: false, error: error.message });
  });

  it("maps a Zod error to field errors", () => {
    const parsed = z.object({ name: z.string().min(2, "Too short") }).safeParse({ name: "a" });
    expect(toActionResult(parsed.error)).toEqual({
      ok: false,
      error: "Please check your input",
      fieldErrors: { name: ["Too short"] },
    });
  });

  it("rethrows anything unexpected", () => {
    const boom = new Error("boom");
    expect(() => toActionResult(boom)).toThrow(boom);
  });
});
