import type { Metadata } from "next";
import { getInvoiceDraft, loadInvoiceDraft } from "@/lib/demo/draftStore";
import { normalizeInvoiceDraft } from "@/lib/demo/invoiceDraft";
import InvoiceEditor from "./InvoiceEditor";

export const metadata: Metadata = {
  title: "Client invoice drafter",
  description:
    "Draft invoices for website and software development clients",
};

export const dynamic = "force-dynamic";

type EditorPageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const params = await searchParams;
  const id = params.id?.trim();
  const loaded = id ? loadInvoiceDraft(id) : null;
  const initialDraft = normalizeInvoiceDraft(loaded ?? getInvoiceDraft());
  return <InvoiceEditor initialDraft={initialDraft} />;
}
