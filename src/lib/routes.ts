/** Central route helpers — keep navigation consistent across the app. */

export const routes = {
  home: "/",
  invoices: "/invoices",
  newInvoice: "/invoices/new",
  editor: (id?: string) =>
    id ? `/editor?id=${encodeURIComponent(id)}` : "/editor",
  login: "/login",
  settings: "/settings",
  invoiceHtml: (id: string, returnTo?: string) => {
    const base = `/api/invoices/${encodeURIComponent(id)}/html`;
    if (!returnTo) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}returnTo=${encodeURIComponent(returnTo)}`;
  },
  invoicePdf: (id: string, token?: string) => {
    const base = `/api/invoices/${encodeURIComponent(id)}/pdf`;
    if (!token) return base;
    return `${base}?token=${encodeURIComponent(token)}`;
  },
  invoicePage: (id: string, returnTo?: string) => {
    const base = `/orders/${encodeURIComponent(id)}/invoice`;
    if (!returnTo) return base;
    return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
  },
  invoiceShare: (id: string) =>
    `/api/invoices/${encodeURIComponent(id)}/share`,
} as const;

export type NavKey = "home" | "library" | "editor" | "settings";

export function navKeyFromPath(pathname: string): NavKey | null {
  if (pathname === "/") return "home";
  if (pathname === "/invoices") return "library";
  if (pathname.startsWith("/invoices/")) return "library";
  if (pathname === "/editor" || pathname.startsWith("/editor")) {
    return "editor";
  }
  if (pathname === "/settings" || pathname.startsWith("/settings")) {
    return "settings";
  }
  return null;
}

export function absoluteUrl(path: string, origin?: string): string {
  if (path.startsWith("http")) return path;
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}

export function appendQueryParam(
  url: string,
  key: string,
  value: string
): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}
