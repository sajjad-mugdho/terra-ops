import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Optimistic only: it checks that a cookie exists, not that it is valid. Services do the real check.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/admiral/:path*", "/manager/:path*", "/captain/:path*", "/customer/:path*"],
};
