import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/route-utils";
import { isStudioAuthRequired } from "@/lib/config/env";
import { isStudioAuthenticated } from "@/lib/auth/studioAuth";
import { RATE_LIMITS, type RateLimitKey } from "@/lib/security/rate-limit";

/** Rate limit + optional studio auth for mutation/read API routes. */
export async function guardStudioApi(
  request: Request,
  options?: { rateLimit?: RateLimitKey }
): Promise<NextResponse | null> {
  if (options?.rateLimit) {
    const limited = await enforceRateLimit(
      request,
      options.rateLimit,
      RATE_LIMITS[options.rateLimit]
    );
    if (limited) return limited;
  }

  if (isStudioAuthRequired() && !(await isStudioAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
