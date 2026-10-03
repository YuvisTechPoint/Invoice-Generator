import type { Metadata } from "next";
import StudioNav from "@/components/StudioNav";
import StudioFooter from "@/components/StudioFooter";
import StorageBanner from "@/components/StorageBanner";
import { getStorageStatus } from "@/lib/data/jsonStorage";
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
  searchParams: Promise<{ error?: string; id?: string; message?: string }>;
};

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const storage = getStorageStatus();
  let initialError: string | null = null;

  if (params.error === "not-found") {
    initialError = params.id
      ? `Invoice "${params.id}" was not found. It may have been deleted.`
      : "That invoice was not found.";
  } else if (params.error === "storage" && !storage.warning) {
    initialError =
      params.message?.trim() ||
      "Storage is not configured. Connect Vercel storage and redeploy.";
  }

  let invoices: InvoiceListItem[] = [];
  let activeInvoiceId: string | null = null;

  try {
    const [listed, settings] = await Promise.all([
      listStoredInvoices(),
      getStudioSettings(),
    ]);
    invoices = listed;
    activeInvoiceId = settings.activeInvoiceId;
  } catch (error) {
    if (!initialError && !storage.warning) {
      initialError =
        error instanceof Error
          ? error.message
          : "Unable to load invoices. Check storage configuration.";
    }
  }

  return (
    <div className="studio-shell">
      <StudioNav active="library" />
      <div className="studio-container" style={{ paddingTop: "1rem" }}>
        <StorageBanner status={storage} />
      </div>
      <InvoicesClient
        initialInvoices={invoices}
        initialActiveId={activeInvoiceId}
        initialError={initialError}
        storageReady={storage.persistent}
      />
      <StudioFooter />
    </div>
  );
}
