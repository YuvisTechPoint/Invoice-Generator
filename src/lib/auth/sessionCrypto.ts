/**
 * Session HMAC helpers. Uses Web Crypto so middleware (Edge) and
 * Node route handlers can share the same token format.
 */

export const STUDIO_SESSION_COOKIE = "studio_session";
export const STUDIO_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.INVOICE_ACCESS_SECRET?.trim() ||
    "dev-only-session-secret-change-me"
  );
}

export function getStudioPassword(): string {
  return process.env.STUDIO_PASSWORD?.trim() || "studio";
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.STUDIO_PASSWORD?.trim());
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: string): Promise<string> {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return toBase64Url(signature);
}

export async function createSessionToken(): Promise<string> {
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        v: 1,
        role: "studio",
        exp: Date.now() + STUDIO_SESSION_MAX_AGE_SECONDS * 1000,
      })
    )
  );
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  try {
    const key = await getHmacKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(payload)
    );
    if (!ok) return false;

    const json = new TextDecoder().decode(fromBase64Url(payload));
    const data = JSON.parse(json) as { exp?: number; role?: string };
    if (data.role !== "studio") return false;
    if (!data.exp || Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function verifyStudioPassword(password: string): boolean {
  const expected = getStudioPassword();
  if (password.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < password.length; i++) {
    mismatch |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isProductionHardened(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.SESSION_SECRET?.trim() || "";
  const password = process.env.STUDIO_PASSWORD?.trim() || "";
  const invoiceSecret = process.env.INVOICE_ACCESS_SECRET?.trim() || "";
  const weak =
    !secret ||
    secret.includes("change-me") ||
    secret.length < 24 ||
    !password ||
    password === "studio" ||
    !invoiceSecret ||
    invoiceSecret.includes("change-me");
  return !weak;
}
