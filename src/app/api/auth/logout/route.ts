import { NextResponse } from "next/server";
import { clearStudioSessionCookie } from "@/lib/auth/studioAuth";

export async function POST() {
  await clearStudioSessionCookie();
  return NextResponse.json({ ok: true });
}
