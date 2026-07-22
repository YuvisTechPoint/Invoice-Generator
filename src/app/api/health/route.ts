import { NextResponse } from "next/server";
import { isProductionHardened } from "@/lib/auth/studioAuth";
import { getDataDir } from "@/lib/data/paths";
import { listStoredInvoices } from "@/lib/data/invoiceStore";
import { isInvoicePdfEnabled } from "@/features/invoice/server/resolveInvoiceOrder";

export async function GET() {
  const invoices = listStoredInvoices();
  return NextResponse.json({
    ok: true,
    service: "invoice-generation-system",
    time: new Date().toISOString(),
    dataDir: getDataDir(),
    invoiceCount: invoices.length,
    pdfEnabled: isInvoicePdfEnabled(),
    productionHardened: isProductionHardened(),
  });
}
