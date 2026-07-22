import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  STUDIO_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth/sessionCrypto";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/health",
  "/_next",
  "/favicon",
  "/brand",
  "/icon",
];

function isPublic(pathname: string): boolean {
  if (
    PUBLIC_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p)
    )
  ) {
    return true;
  }
  if (
    pathname.startsWith("/api/invoices/") &&
    (pathname.endsWith("/html") || pathname.endsWith("/pdf"))
  ) {
    return true;
  }
  if (pathname.startsWith("/orders/") && pathname.endsWith("/invoice")) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const passwordSet = Boolean(process.env.STUDIO_PASSWORD?.trim());
  const requireAuth =
    process.env.NODE_ENV === "production" || passwordSet;

  if (!requireAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get(STUDIO_SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
