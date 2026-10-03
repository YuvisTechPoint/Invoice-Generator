import { NextResponse } from "next/server";
import { isProductionHardened } from "@/lib/auth/studioAuth";
import {
  getProductionIssues,
  isProductionEnv,
  isStudioAuthDisabled,
} from "@/lib/config/env";
import { listStoredInvoices } from "@/lib/data/invoiceStore";
import {
  getStorageStatus,
  hasPostgresCredentials,
  verifyPostgresStorage,
} from "@/lib/data/jsonStorage";
import { isInvoicePdfEnabled } from "@/features/invoice/server/resolveInvoiceOrder";

export async function GET() {
  let invoiceCount = 0;
  let storageError: string | undefined;

  const storage = getStorageStatus();
  let postgresConnected: boolean | undefined;

  if (hasPostgresCredentials()) {
    postgresConnected = await verifyPostgresStorage();
    if (!postgresConnected && storage.driver === "postgres") {
      storageError =
        "Postgres env vars are set but the database connection failed. Redeploy after linking Neon to this Vercel project.";
    }
  }

  try {
    const invoices = await listStoredInvoices();
    invoiceCount = invoices.length;
  } catch (error) {
    storageError =
      error instanceof Error ? error.message : "Unable to read invoice storage";
  }

  const productionHardened = isProductionHardened();
  const issues = getProductionIssues();
  const configured =
    productionHardened &&
    issues.length === 0 &&
    !storageError &&
    storage.persistent &&
    (storage.driver !== "postgres" || postgresConnected === true);

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
    ...(postgresConnected !== undefined ? { postgresConnected } : {}),
    ...(storageError ? { storageError } : {}),
    ...(storage.warning ? { storageWarning: storage.warning } : {}),
    ...(isProductionEnv()
      ? { issues: issues.length ? issues : undefined }
      : { dataDir: process.env.DATA_DIR ?? "./data" }),
  });
}
