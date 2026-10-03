import { redirect } from "next/navigation";
import { createNewInvoice } from "@/lib/server/invoiceWorkflow";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** Creates a fresh invoice and opens it in the editor. */
export default async function NewInvoicePage() {
  const invoice = await createNewInvoice();
  redirect(routes.editor(invoice.id));
}
