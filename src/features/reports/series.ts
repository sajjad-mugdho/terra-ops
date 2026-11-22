export type SeriesUnit = "day" | "month" | "year";

type Period = { start: Date; end: Date };

const DAY_MS = 86_400_000;

// Keeps a chart near 120 points at most, whatever range is asked for.
export function seriesUnit(period: Period): SeriesUnit {
  const days = (period.end.getTime() - period.start.getTime()) / DAY_MS;
  if (days <= 92) return "day";
  return days <= 3660 ? "month" : "year";
}

// The range of the same length that ends where this one starts.
export function previousPeriod(period: Period): Period {
  const length = period.end.getTime() - period.start.getTime();
  return { start: new Date(period.start.getTime() - length), end: period.start };
}

// Change in percent. null when the earlier value is 0, so there is nothing to compare with.
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const LABELS: Record<SeriesUnit, Intl.DateTimeFormat> = {
  day: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
  month: new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }),
  year: new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "UTC" }),
};

// The axis label of a point: "23 Oct", "Oct 2026" or "2026". date is YYYY-MM-DD in UTC.
export function bucketLabel(date: string, unit: SeriesUnit): string {
  return LABELS[unit].format(new Date(`${date}T00:00:00Z`));
}
