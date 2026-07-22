import "server-only";
import { cookies } from "next/headers";
import {
  STUDIO_SESSION_COOKIE,
  STUDIO_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isAuthConfigured,
  verifySessionToken,
} from "@/lib/auth/sessionCrypto";

export {
  getStudioPassword,
  isAuthConfigured,
  isProductionHardened,
  verifySessionToken,
  verifyStudioPassword,
  createSessionToken,
  STUDIO_SESSION_COOKIE,
} from "@/lib/auth/sessionCrypto";

export function getSessionCookieName(): string {
  return STUDIO_SESSION_COOKIE;
}

export async function setStudioSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(STUDIO_SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STUDIO_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearStudioSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(STUDIO_SESSION_COOKIE);
}

export async function isStudioAuthenticated(): Promise<boolean> {
  if (!isAuthConfigured() && process.env.NODE_ENV !== "production") {
    return true;
  }
  const jar = await cookies();
  return verifySessionToken(jar.get(STUDIO_SESSION_COOKIE)?.value);
}
