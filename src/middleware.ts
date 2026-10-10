import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.hostname || "";
  const pathname = request.nextUrl.pathname;

  // Check if request is coming from the dedicated customer offers domain
  const isOffersDomain =
    host.includes("belezia-offers") ||
    host.includes("offers.belezia") ||
    request.nextUrl.searchParams.get("view") === "offers_only";

  if (isOffersDomain) {
    // Allow static assets, next internal bundles, and API routes to function normally
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.startsWith("/favicon.ico") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    // On the offers domain, ANY page access (root /, /admin, /pos, etc.) is strictly restricted to Spin the Wheel
    if (pathname !== "/spin") {
      const spinUrl = new URL(`/spin${request.nextUrl.search}`, request.url);
      return NextResponse.rewrite(spinUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
