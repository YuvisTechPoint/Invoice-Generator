import "server-only";

import {
  getDefaultInvoiceDraft,
  normalizeInvoiceDraft,
  type InvoiceDraft,
} from "@/lib/demo/invoiceDraft";
import {
  getStoredInvoice,
  listStoredInvoices,
  saveStoredInvoice,
} from "@/lib/data/invoiceStore";
import {
  allocateInvoiceNumber,
  allocateProjectRef,
  getStudioSettings,
  setActiveInvoiceId,
} from "@/lib/data/settingsStore";

async function withStudioDefaults(draft: InvoiceDraft): Promise<InvoiceDraft> {
  const settings = await getStudioSettings();
  return normalizeInvoiceDraft({
    ...draft,
    seller: {
      ...settings.sellerDefaults,
      ...draft.seller,
    },
  });
}

/** Active invoice draft for the editor (persisted). */
export async function getInvoiceDraft(): Promise<InvoiceDraft> {
  const settings = await getStudioSettings();
  if (settings.activeInvoiceId) {
    const stored = await getStoredInvoice(settings.activeInvoiceId);
    if (stored?.draft) {
      return normalizeInvoiceDraft(stored.draft);
    }
  }

  const latest = (await listStoredInvoices())[0];
  if (latest) {
    const stored = await getStoredInvoice(latest.id);
    if (stored?.draft) {
      await setActiveInvoiceId(stored.id);
      return normalizeInvoiceDraft(stored.draft);
    }
  }

  const studio = await getStudioSettings();
  const draft = await withStudioDefaults({
    ...getDefaultInvoiceDraft(),
    orderId: allocateProjectRef(),
    invoiceNumber: await allocateInvoiceNumber(),
    seller: { ...studio.sellerDefaults },
  });
  const saved = await saveStoredInvoice(draft, { status: "draft" });
  await setActiveInvoiceId(saved.id);
  return normalizeInvoiceDraft(saved.draft);
}

export async function saveInvoiceDraft(draft: InvoiceDraft): Promise<InvoiceDraft> {
  const normalized = await withStudioDefaults(normalizeInvoiceDraft(draft));
  const existing = await getStoredInvoice(normalized.orderId);
  const saved = await saveStoredInvoice(
    normalized,
    existing ? {} : { status: "draft" }
  );
  await setActiveInvoiceId(saved.id);
  return normalizeInvoiceDraft(saved.draft);
}

export async function resetInvoiceDraft(): Promise<InvoiceDraft> {
  const settings = await getStudioSettings();
  const draft = await withStudioDefaults({
    ...getDefaultInvoiceDraft(),
    orderId: allocateProjectRef(),
    invoiceNumber: await allocateInvoiceNumber(),
    seller: { ...settings.sellerDefaults },
  });
  const saved = await saveStoredInvoice(draft, { status: "draft" });
  await setActiveInvoiceId(saved.id);
  return normalizeInvoiceDraft(saved.draft);
}

export async function loadInvoiceDraft(id: string): Promise<InvoiceDraft | null> {
  const stored = await getStoredInvoice(id);
  if (!stored?.draft) return null;
  await setActiveInvoiceId(stored.id);
  return normalizeInvoiceDraft(stored.draft);
}
