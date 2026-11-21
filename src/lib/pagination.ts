// C10: every paged list shows 20 rows.
export const PAGE_SIZE = 20;

export type Paged<T> = { rows: T[]; total: number; page: number; pageCount: number };

// A page from the URL. Anything that is not a whole number of 1 or more is page 1.
export function parsePage(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  return Math.max(1, Math.min(Number(value), Number.MAX_SAFE_INTEGER));
}

// A page past the end becomes the last page. An empty list still has one page.
export function pageWindow(page: number, total: number) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  return { page: current, pageCount, offset: (current - 1) * PAGE_SIZE, limit: PAGE_SIZE };
}

// The link of one page. Page 1 and empty filters stay out of the URL.
export function pageHref(path: string, params: Record<string, string | undefined>, page: number): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value) query.set(name, value);
  }
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
