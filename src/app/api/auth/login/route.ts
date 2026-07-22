import { NextResponse } from "next/server";
import {
  clearStudioSessionCookie,
  setStudioSessionCookie,
  verifyStudioPassword,
} from "@/lib/auth/studioAuth";

export async function POST(request: Request) {
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
