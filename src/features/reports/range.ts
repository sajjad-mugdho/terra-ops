export const DEFAULT_RANGE_DAYS = 30;

const DAY_MS = 86_400_000;

// from and to are UTC days, both inclusive. end is the first instant after the range.
export type DateRange = { from: string; to: string; start: Date; end: Date };

const dayText = (date: Date) => date.toISOString().slice(0, 10);

// A real calendar day written as YYYY-MM-DD, read as UTC midnight.
export function parseDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && dayText(date) === value ? date : null;
}

export function defaultRange(now: Date = new Date()): DateRange {
  const today = new Date(`${dayText(now)}T00:00:00.000Z`);
  const start = new Date(today.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  return { from: dayText(start), to: dayText(today), start, end: new Date(today.getTime() + DAY_MS) };
}

// What is wrong with the two dates, or null when they make a range.
export function rangeError(from: unknown, to: unknown): string | null {
  const start = parseDay(from);
  const last = parseDay(to);
  if (!start || !last) return "Enter both dates as YYYY-MM-DD";
  if (start > last) return "The start date must be on or before the end date";
  return null;
}

// The range from the URL, or the default range when the URL has none or a bad one.
export function parseRange(from: unknown, to: unknown, now: Date = new Date()): DateRange {
  const start = parseDay(from);
  const last = parseDay(to);
  if (!start || !last || start > last) return defaultRange(now);
  return { from: dayText(start), to: dayText(last), start, end: new Date(last.getTime() + DAY_MS) };
}
