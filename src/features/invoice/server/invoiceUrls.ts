import "server-only";

import type { InvoiceUrls } from "@/features/invoice/types";
import { createInvoiceAccessToken } from "@/lib/security/invoiceAccessToken";
import type { Order } from "@/types/order";

export type { InvoiceUrls };

function appendToken(path: string, orderId: string, email: string): string {
  const token = createInvoiceAccessToken(orderId, email);
  if (!token) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}token=${encodeURIComponent(token)}`;
}

export function buildInvoiceUrls(order: Order): InvoiceUrls | null {
  if (!order.id?.trim() || !order.invoice?.invoiceNumber?.trim()) {
    return null;
  }

  const baseHtml = `/api/invoices/${encodeURIComponent(order.id)}/html`;
  const basePdf = `/api/invoices/${encodeURIComponent(order.id)}/pdf`;
  const basePage = `/orders/${encodeURIComponent(order.id)}/invoice`;

  const html = appendToken(baseHtml, order.id, order.email);
  const pdf = appendToken(basePdf, order.id, order.email);
  const page = appendToken(basePage, order.id, order.email);

  const print = html.includes("?")
    ? `${html}&print=1`
    : `${html}?print=1`;

  const urls: InvoiceUrls = { html, print, page, pdf };
  return urls;
}

export function buildInvoiceDownloadFilename(order: Order): string {
  const invoiceNumber =
    order.invoice?.invoiceNumber?.replace(/[^\w-]+/g, "-") ?? order.id;
  return `Invoice-${invoiceNumber}.pdf`;
}
