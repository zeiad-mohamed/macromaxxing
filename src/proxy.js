// Optimistic auth redirects only (Next.js 16 renamed middleware to proxy).
// Every API handler re-validates the session itself; this file only keeps
// users off pages they clearly can't use.
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/shared/session.js";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasSessionCookie = typeof cookieValue === "string" && cookieValue.length > 0;

  if (pathname === "/" && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if ((pathname === "/login" || pathname === "/register") && hasSessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register"],
};
