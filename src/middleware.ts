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

    return NextResponse.next();
  }

  // STRICT DOMAIN ISOLATION:
  // Do NOT open game on billing domain (https://belezia-salon-billing-app.vercel.app/spin)
  // Only allow game from https://belezia-offers.vercel.app/ (or localhost for local testing)
  const isLocalhost =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("0.0.0.0");

  if (pathname.startsWith("/spin") && !isLocalhost) {
    const search = request.nextUrl.search || "";
    return NextResponse.redirect(
      new URL(`https://belezia-offers.vercel.app/${search}`),
      307
    );
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
