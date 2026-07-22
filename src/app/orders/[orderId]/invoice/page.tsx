import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/server-session";
import { verifyInvoiceAccessToken } from "@/lib/security/invoiceAccessToken";

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ email?: string; token?: string; returnTo?: string }>;
}) {
  const { orderId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const email = resolvedSearchParams?.email?.trim().toLowerCase();
  const token = resolvedSearchParams?.token?.trim();
  const returnTo = resolvedSearchParams?.returnTo?.trim();

  const hasGuestAccess = Boolean(
    token && verifyInvoiceAccessToken(token, orderId, email)
  );
  const sessionUser = hasGuestAccess ? null : await getSessionUser();

  if (!hasGuestAccess && !sessionUser) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1>Invoice unavailable</h1>
        <p>Order not found or not accessible. Use a signed invoice link.</p>
      </main>
    );
  }

  let htmlUrl = `/api/invoices/${encodeURIComponent(orderId)}/html`;

  if (token) {
    htmlUrl = appendQueryParam(htmlUrl, "token", token);
  }

  if (returnTo) {
    htmlUrl = appendQueryParam(htmlUrl, "returnTo", returnTo);
  }

  redirect(htmlUrl);
}
