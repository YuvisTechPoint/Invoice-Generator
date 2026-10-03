import { NextResponse } from "next/server";
import { isProductionHardened } from "@/lib/auth/studioAuth";
import {
  getProductionIssues,
  isProductionEnv,
  isStudioAuthDisabled,
} from "@/lib/config/env";
import { listStoredInvoices } from "@/lib/data/invoiceStore";
import { getStorageStatus } from "@/lib/data/jsonStorage";
import { isInvoicePdfEnabled } from "@/features/invoice/server/resolveInvoiceOrder";

export async function GET() {
  let invoiceCount = 0;
  let storageError: string | undefined;

  try {
    const invoices = await listStoredInvoices();
    invoiceCount = invoices.length;
  } catch (error) {
    storageError =
      error instanceof Error ? error.message : "Unable to read invoice storage";
  }

  const storage = getStorageStatus();
  const productionHardened = isProductionHardened();
  const issues = getProductionIssues();
  const configured =
    productionHardened && issues.length === 0 && !storageError && storage.persistent;

  return NextResponse.json({
    ok: true,
    configured,
    service: "invoice-generator",
    version: process.env.npm_package_version ?? "1.0.0",
    time: new Date().toISOString(),
    invoiceCount,
    pdfEnabled: isInvoicePdfEnabled(),
    productionHardened,
    authDisabled: isStudioAuthDisabled(),
    storage: storage.driver,
    storagePersistent: storage.persistent,
    ...(storageError ? { storageError } : {}),
    ...(storage.warning ? { storageWarning: storage.warning } : {}),
    ...(isProductionEnv()
      ? { issues: issues.length ? issues : undefined }
      : { dataDir: process.env.DATA_DIR ?? "./data" }),
  });
}
