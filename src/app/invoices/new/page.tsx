import { redirect } from "next/navigation";
import { StorageUnavailableError } from "@/lib/data/jsonStorage";
import { createNewInvoice } from "@/lib/server/invoiceWorkflow";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** Creates a fresh invoice and opens it in the editor. */
export default async function NewInvoicePage() {
  let invoice;
  try {
    invoice = await createNewInvoice();
  } catch (error) {
    if (error instanceof StorageUnavailableError) {
      redirect(
        `${routes.invoices}?error=storage&message=${encodeURIComponent(error.message)}`
      );
    }
    throw error;
  }

  redirect(routes.editor(invoice.id));
}
