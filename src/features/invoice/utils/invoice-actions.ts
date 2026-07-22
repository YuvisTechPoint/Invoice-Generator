import type { InvoiceUrls } from "@/features/invoice/types";

export function isClientInvoicePdfEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_INVOICE_PDF_ENABLED;
  if (flag === undefined || flag === "") return true;
  return flag === "true" || flag === "1";
}

export function getInvoiceDownloadAction(
  invoiceUrls: InvoiceUrls | null | undefined
): { href: string; label: string } | null {
  if (!invoiceUrls) return null;

  // Prefer PDF whenever the server attached a pdf URL (INVOICE_PDF_ENABLED and/or
  // NEXT_PUBLIC_INVOICE_PDF_ENABLED). Do not hide the button when only the server flag is set.
  if (invoiceUrls.pdf) {
    return { href: invoiceUrls.pdf, label: "Download PDF" };
  }

  if (invoiceUrls.print) {
    return { href: invoiceUrls.print, label: "Print / Save as PDF" };
  }

  return invoiceUrls.html
    ? { href: invoiceUrls.html, label: "View invoice" }
    : null;
}
