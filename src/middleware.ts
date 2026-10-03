import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  STUDIO_SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth/sessionCrypto";
import { isPublicPath, isStudioAuthRequired } from "@/lib/config/env";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isStudioAuthRequired()) {
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
