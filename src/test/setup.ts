import { vi } from "vitest";
import { requestHeaders } from "./session";

// Outside a real request, next/headers has nothing to read. Tests supply the headers.
vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.current,
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));
