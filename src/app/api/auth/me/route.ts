import { NextResponse } from "next/server";
import { isStudioAuthenticated } from "@/lib/auth/studioAuth";
import { isStudioAuthRequired } from "@/lib/config/env";

export async function GET() {
  const authRequired = isStudioAuthRequired();
  const authenticated = authRequired ? await isStudioAuthenticated() : true;

  return NextResponse.json({
    authRequired,
    authenticated,
  });
}
