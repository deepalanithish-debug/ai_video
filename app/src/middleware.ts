import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth/login", "/api/auth/signup"];
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and API routes (except auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    (pathname.startsWith("/api") && !pathname.startsWith("/api/auth"))
  ) {
    return NextResponse.next();
  }

  const session = await getRequestSession(req);

  // Logged-in user trying to access login/signup → redirect to home
  if (session && AUTH_ONLY_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Unauthenticated user trying to access protected routes
  if (!session && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
