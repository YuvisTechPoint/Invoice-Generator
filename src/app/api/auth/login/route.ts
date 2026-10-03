import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/route-utils";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  clearStudioSessionCookie,
  setStudioSessionCookie,
  verifyStudioPassword,
} from "@/lib/auth/studioAuth";
import { isStudioAuthRequired } from "@/lib/config/env";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "login", RATE_LIMITS.login);
  if (limited) return limited;

  if (!isStudioAuthRequired()) {
    return NextResponse.json(
      { error: "Studio login is disabled" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";
    if (!verifyStudioPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    await setStudioSessionCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearStudioSessionCookie();
  return NextResponse.json({ ok: true });
}
