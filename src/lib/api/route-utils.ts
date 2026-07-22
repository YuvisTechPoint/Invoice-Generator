import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  return `${scope}:${ip}`;
}

/** Simple in-memory rate limit (per process). */
export async function enforceRateLimit(
  request: Request,
  key: string,
  config: { limit: number; windowMs: number }
): Promise<NextResponse | null> {
  const id = clientKey(request, key);
  const now = Date.now();
  const existing = buckets.get(id);

  if (!existing || now >= existing.resetAt) {
    buckets.set(id, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count > config.limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return null;
}
