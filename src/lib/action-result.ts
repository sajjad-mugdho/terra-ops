import { z } from "zod";
import { AppError } from "./errors";

export type FieldErrors = Record<string, string[]>;

export type ActionFailure = { ok: false; error: string; fieldErrors?: FieldErrors };

export type ActionResult<T = undefined> = { ok: true; data?: T } | ActionFailure;

export function toActionResult(error: unknown): ActionFailure {
  if (error instanceof AppError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) {
    return {
      ok: false,
      error: "Please check your input",
      fieldErrors: z.flattenError(error).fieldErrors as FieldErrors,
    };
  }
  // Unexpected errors and Next.js redirects must reach the framework.
  throw error;
}
