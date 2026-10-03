/** Edge-safe environment helpers (no Node-only imports). */

export function isStudioAuthDisabled(): boolean {
  const flag = process.env.STUDIO_AUTH_DISABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

export function isStudioAuthRequired(): boolean {
  if (isStudioAuthDisabled()) return false;
  return Boolean(process.env.STUDIO_PASSWORD?.trim());
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getPublicSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/health",
  "/_next",
  "/favicon",
  "/brand",
  "/icon",
  "/robots.txt",
];

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;

  if (
    pathname === "/api/auth/me" ||
    pathname === "/api/studio/config"
  ) {
    return true;
  }

  if (
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  if (
    pathname.startsWith("/api/invoices/") &&
    (pathname.endsWith("/html") || pathname.endsWith("/pdf"))
  ) {
    return true;
  }

  if (pathname.startsWith("/orders/") && pathname.endsWith("/invoice")) {
    return true;
  }

  return false;
}

export function getInvoiceAccessSecret(): string {
  return (
    process.env.INVOICE_ACCESS_SECRET?.trim() ||
    process.env.GUEST_ORDER_ACCESS_SECRET?.trim() ||
    ""
  );
}

/** True when a signing secret exists (min length). */
export function hasInvoiceAccessSecretConfigured(): boolean {
  return getInvoiceAccessSecret().length >= 16;
}

/** Production-hardened secret check; relaxed in local/dev. */
export function hasStrongInvoiceAccessSecret(): boolean {
  const secret = getInvoiceAccessSecret();
  if (secret.length < 16) return false;
  if (!isProductionEnv()) return true;
  return (
    !secret.includes("change-me") &&
    !secret.includes("dev-invoice-access-secret")
  );
}

/** Whether Issue & share can run right now. */
export function canIssueClientShareLinks(): boolean {
  return hasInvoiceAccessSecretConfigured();
}

export function isVercelDeployment(): boolean {
  return Boolean(process.env.VERCEL?.trim());
}

export function getProductionIssues(): string[] {
  if (!isProductionEnv()) return [];

  const issues: string[] = [];

  if (!hasStrongInvoiceAccessSecret()) {
    issues.push("Set a strong INVOICE_ACCESS_SECRET (min 16 chars, not a placeholder).");
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    issues.push("Set NEXT_PUBLIC_SITE_URL to your public HTTPS origin.");
  }

  if (
    isVercelDeployment() &&
    !process.env.BLOB_READ_WRITE_TOKEN?.trim() &&
    !process.env.BLOB_STORE_ID?.trim()
  ) {
    issues.push(
      "Connect Vercel Blob storage so invoices persist across serverless invocations."
    );
  }

  if (isStudioAuthRequired()) {
    const session = process.env.SESSION_SECRET?.trim() || "";
    const password = process.env.STUDIO_PASSWORD?.trim() || "";
    if (!session || session.length < 24 || session.includes("change-me")) {
      issues.push("Set SESSION_SECRET (min 24 chars) when studio auth is enabled.");
    }
    if (!password || password === "studio") {
      issues.push("Set a strong STUDIO_PASSWORD when studio auth is enabled.");
    }
  } else if (!isStudioAuthDisabled()) {
    issues.push(
      "Studio auth is off but STUDIO_PASSWORD is unset. Set STUDIO_AUTH_DISABLED=true for a private install, or enable auth for public deployment."
    );
  }

  if (process.env.INVOICE_PDF_ENABLED === "false") {
    return issues;
  }

  return issues;
}
