import { NextResponse } from "next/server";
import { isProductionHardened } from "@/lib/auth/studioAuth";
import {
  getProductionIssues,
  isProductionEnv,
  isStudioAuthDisabled,
} from "@/lib/config/env";
import { listStoredInvoices } from "@/lib/data/invoiceStore";
import { useBlobStorage } from "@/lib/data/jsonStorage";
import { isInvoicePdfEnabled } from "@/features/invoice/server/resolveInvoiceOrder";

export async function GET() {
  const invoices = await listStoredInvoices();
  const productionHardened = isProductionHardened();
  const issues = getProductionIssues();
  const configured = productionHardened && issues.length === 0;

  return NextResponse.json({
    ok: true,
    configured,
    service: "invoice-generator",
    version: process.env.npm_package_version ?? "1.0.0",
    time: new Date().toISOString(),
    invoiceCount: invoices.length,
    pdfEnabled: isInvoicePdfEnabled(),
    productionHardened,
    authDisabled: isStudioAuthDisabled(),
    storage: useBlobStorage() ? "blob" : "filesystem",
    ...(isProductionEnv()
      ? { issues: issues.length ? issues : undefined }
      : { dataDir: process.env.DATA_DIR ?? "./data" }),
  });
}
