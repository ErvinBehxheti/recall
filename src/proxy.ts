// src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./server/session-cookie";

// Optimistic check only: is there a session cookie at all. Pages and handlers verify it for real.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/teacher/:path*", "/learn/:path*", "/join"] };
