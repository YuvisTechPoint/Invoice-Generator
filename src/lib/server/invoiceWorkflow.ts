import "server-only";

import {
  getStoredInvoice,
  listStoredInvoices,
  saveStoredInvoice,
  type StoredInvoice,
} from "@/lib/data/invoiceStore";
import {
  allocateInvoiceNumber,
  allocateProjectRef,
  getStudioSettings,
  setActiveInvoiceId,
} from "@/lib/data/settingsStore";
import {
  draftToOrder,
  getDefaultInvoiceDraft,
  normalizeInvoiceDraft,
} from "@/lib/demo/invoiceDraft";
import { upsertOrder } from "@/lib/server/orderService";

/** Create a new blank invoice, persist it, and set as active. */
export async function createNewInvoice(): Promise<StoredInvoice> {
  const settings = await getStudioSettings();
  const draft = normalizeInvoiceDraft({
    ...getDefaultInvoiceDraft(),
    orderId: allocateProjectRef(),
    invoiceNumber: await allocateInvoiceNumber(),
    seller: { ...settings.sellerDefaults },
  });

  const saved = await saveStoredInvoice(draft, { status: "draft" });
  await setActiveInvoiceId(saved.id);
  await upsertOrder(draftToOrder(saved.draft), saved.draft);
  return saved;
}

async function latestInvoiceId(): Promise<string | null> {
  const items = await listStoredInvoices();
  return items[0]?.id ?? null;
}

async function resolveExistingActiveId(): Promise<string | null> {
  const settings = await getStudioSettings();
  const activeId = settings.activeInvoiceId?.trim();
  if (!activeId) return null;
  if (!(await getStoredInvoice(activeId))) {
    await setActiveInvoiceId(await latestInvoiceId());
    return (await getStudioSettings()).activeInvoiceId;
  }
  return activeId;
}

/** Resolve the best editor target: active invoice, latest, or create new. */
export async function resolveEditorInvoiceId(): Promise<string> {
  const active = await resolveExistingActiveId();
  if (active) return active;

  const latest = await latestInvoiceId();
  if (latest) {
    await setActiveInvoiceId(latest);
    return latest;
  }

  return (await createNewInvoice()).id;
}

/** Best editor href target without creating a new invoice when possible. */
export async function resolveEditorHrefId(): Promise<string | null> {
  return (await resolveExistingActiveId()) ?? (await latestInvoiceId());
}

/** Clone an invoice as a new draft with fresh ids and invoice number. */
export async function duplicateInvoice(sourceId: string): Promise<StoredInvoice | null> {
  const source = await getStoredInvoice(sourceId);
  if (!source?.draft) return null;

  const settings = await getStudioSettings();
  const today = new Date().toISOString().slice(0, 10);
  const draft = normalizeInvoiceDraft({
    ...source.draft,
    orderId: allocateProjectRef(),
    invoiceNumber: await allocateInvoiceNumber(),
    invoiceDate: today,
    orderDate: today,
    seller: { ...settings.sellerDefaults, ...source.draft.seller },
  });

  const saved = await saveStoredInvoice(draft, { status: "draft" });
  await setActiveInvoiceId(saved.id);
  await upsertOrder(draftToOrder(saved.draft), saved.draft);
  return saved;
}

/** Mark invoice as void (archived). */
export async function voidInvoice(id: string): Promise<StoredInvoice | null> {
  const existing = await getStoredInvoice(id);
  if (!existing) return null;
  return saveStoredInvoice(existing.draft, { status: "void" });
}
