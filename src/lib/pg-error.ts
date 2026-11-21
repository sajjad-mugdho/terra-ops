export const UNIQUE_VIOLATION = "23505";
export const CHECK_VIOLATION = "23514";

type PgFields = { code?: unknown; constraint?: unknown };

// Drizzle wraps the driver error, so the Postgres code can sit on the error or on its cause.
export function isPgError(error: unknown, code: string, constraint?: string): boolean {
  const outer = error as (PgFields & { cause?: PgFields }) | null;
  const found = [outer, outer?.cause].find((each) => each?.code === code);
  if (!found) return false;
  return constraint === undefined || found.constraint === constraint;
}
