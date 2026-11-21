export const SEARCH_MAX = 100;

// Search text from the URL: trimmed and cut at 100 characters. Only spaces is no search.
export function parseSearch(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, SEARCH_MAX).trim() || undefined;
}

// A "contains" pattern for LIKE. The wildcards % and _ in the text match themselves.
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}
