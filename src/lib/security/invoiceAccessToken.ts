import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret(): string | null {
  const secret =
    process.env.INVOICE_ACCESS_SECRET?.trim() ||
    process.env.GUEST_ORDER_ACCESS_SECRET?.trim();
  return secret || null;
}

function signPayload(payload: string): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error(
      "GUEST_ORDER_ACCESS_SECRET (or INVOICE_ACCESS_SECRET) is not configured"
    );
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createInvoiceAccessToken(
  orderId: string,
  email: string
): string | null {
  if (!getSecret()) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${orderId}:${normalizedEmail}:${expiresAt}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyInvoiceAccessToken(
  token: string,
  orderId: string,
  email?: string
): boolean {
  if (!getSecret()) return false;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return false;

    const [tokenOrderId, tokenEmail, expiresRaw, signature] = parts;
    if (tokenOrderId !== orderId) return false;

    if (email && tokenEmail !== email.trim().toLowerCase()) {
      return false;
    }

    const expiresAt = Number(expiresRaw);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      return false;
    }

    const payload = `${tokenOrderId}:${tokenEmail}:${expiresRaw}`;
    const expected = signPayload(payload);
    const sigBuf = Buffer.from(signature ?? "");
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export function buildInvoiceAccessUrl(
  orderId: string,
  email: string,
  path: string
): string | null {
  const token = createInvoiceAccessToken(orderId, email);
  if (!token) return null;

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vibemusic.in";
  const url = new URL(path, base);
  url.searchParams.set("token", token);
  return url.toString();
}
