import { redirect } from "next/navigation";
import { isNextRedirectError } from "@/lib/navigation/redirect";
import {
  StorageUnavailableError,
  getStorageStatus,
  requirePersistentStorage,
} from "@/lib/data/jsonStorage";
import { createNewInvoice } from "@/lib/server/invoiceWorkflow";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

function storageRedirect(message: string): never {
  redirect(
    `${routes.invoices}?error=storage&message=${encodeURIComponent(message)}`
  );
}

/** Creates a fresh invoice and opens it in the editor. */
export default async function NewInvoicePage() {
  const storage = getStorageStatus();
  if (!storage.persistent) {
    storageRedirect(storage.warning ?? "Connect Vercel Blob storage and redeploy.");
  }

  try {
    requirePersistentStorage();
    const invoice = await createNewInvoice();
    redirect(routes.editor(invoice.id));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof StorageUnavailableError) {
      storageRedirect(error.message);
    }
    throw error;
  }
}
