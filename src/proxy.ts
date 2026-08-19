import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchesRoute } from "@/lib/roles";

/**
 * Next.js 16 Edge / Proxy routing gate.
 *
 * Intentionally lightweight: NO Prisma, NO bcrypt, NO heavy dependencies.
 * Full server-side authorization and data isolation is enforced inside Server Components
 * and Route Handlers via requireAuth() / requireRole().
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isProtectedPath =
    matchesRoute(pathname, "/account") ||
    matchesRoute(pathname, "/admin") ||
    matchesRoute(pathname, "/fulfilment") ||
    matchesRoute(pathname, "/support");

  if (isProtectedPath) {
    // Check for Auth.js session cookie (standard or secure variant)
    const sessionToken =
      req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-authjs.session-token")?.value ||
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/fulfilment/:path*",
    "/support/:path*",
  ],
};
