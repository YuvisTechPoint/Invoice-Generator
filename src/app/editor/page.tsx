import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadInvoiceDraft } from "@/lib/demo/draftStore";
import { getStoredInvoice } from "@/lib/data/invoiceStore";
import {
  resolveEditorHrefId,
} from "@/lib/server/invoiceWorkflow";
import { routes } from "@/lib/routes";
import InvoiceEditor from "./InvoiceEditor";

export const metadata: Metadata = {
  title: "Editor",
  description: "Create and edit invoices with live preview",
};

export const dynamic = "force-dynamic";

type EditorPageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const params = await searchParams;
  const id = params.id?.trim();

  if (!id) {
    const target = await resolveEditorHrefId();
    redirect(target ? routes.editor(target) : routes.newInvoice);
  }

  const [stored, loaded] = await Promise.all([
    getStoredInvoice(id),
    loadInvoiceDraft(id),
  ]);
  if (!loaded || !stored) {
    redirect(`${routes.invoices}?error=not-found&id=${encodeURIComponent(id)}`);
  }

  return (
    <InvoiceEditor
      initialDraft={loaded}
      initialStatus={stored.status}
      issuedAt={stored.issuedAt}
    />
  );
}
