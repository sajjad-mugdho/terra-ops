import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie } } : undefined);

describe("proxy", () => {
  it.each(["/admiral", "/manager/queue", "/captain/trip", "/customer/orders"])(
    "sends a visitor on %s to /login",
    (path) => {
      const response = proxy(request(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    },
  );

  it.each(["better-auth.session_token=anything", "__Secure-better-auth.session_token=anything"])(
    "lets a request with the cookie %s pass, valid or not",
    (cookie) => {
      const response = proxy(request("/admiral", cookie));
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it("guards every role segment and nothing else", () => {
    expect(config.matcher).toEqual([
      "/admiral/:path*",
      "/manager/:path*",
      "/captain/:path*",
      "/customer/:path*",
    ]);
  });
});
