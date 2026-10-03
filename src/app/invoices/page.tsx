import type { Metadata } from "next";
import StudioNav from "@/components/StudioNav";
import StudioFooter from "@/components/StudioFooter";
import {
  listStoredInvoices,
  type InvoiceListItem,
} from "@/lib/data/invoiceStore";
import { getStudioSettings } from "@/lib/data/settingsStore";
import InvoicesClient from "./InvoicesClient";

export const metadata: Metadata = {
  title: "Library",
  description: "Browse and manage your saved invoices",
};

export const dynamic = "force-dynamic";

type InvoicesPageProps = {
  searchParams: Promise<{ error?: string; id?: string }>;
};

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  let initialError: string | null = null;

  if (params.error === "not-found") {
    initialError = params.id
      ? `Invoice "${params.id}" was not found. It may have been deleted.`
      : "That invoice was not found.";
  }

  const [invoices, settings] = await Promise.all([
    listStoredInvoices(),
    getStudioSettings(),
  ]);

  return (
    <div className="studio-shell">
      <StudioNav active="library" />
      <InvoicesClient
        initialInvoices={invoices}
        initialActiveId={settings.activeInvoiceId}
        initialError={initialError}
      />
      <StudioFooter />
    </div>
  );
}
