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

function withStudioDefaults(draft: InvoiceDraft): InvoiceDraft {
  const settings = getStudioSettings();
  return normalizeInvoiceDraft({
    ...draft,
    seller: {
      ...settings.sellerDefaults,
      ...draft.seller,
    },
  });
}

/** Active invoice draft for the editor (persisted). */
export function getInvoiceDraft(): InvoiceDraft {
  const settings = getStudioSettings();
  if (settings.activeInvoiceId) {
    const stored = getStoredInvoice(settings.activeInvoiceId);
    if (stored?.draft) {
      return normalizeInvoiceDraft(stored.draft);
    }
  }

  const latest = listStoredInvoices()[0];
  if (latest) {
    const stored = getStoredInvoice(latest.id);
    if (stored?.draft) {
      setActiveInvoiceId(stored.id);
      return normalizeInvoiceDraft(stored.draft);
    }
  }

  const draft = withStudioDefaults({
    ...getDefaultInvoiceDraft(),
    orderId: allocateProjectRef(),
    invoiceNumber: allocateInvoiceNumber(),
    seller: { ...getStudioSettings().sellerDefaults },
  });
  const saved = saveStoredInvoice(draft, { status: "draft" });
  setActiveInvoiceId(saved.id);
  return normalizeInvoiceDraft(saved.draft);
}

export function saveInvoiceDraft(draft: InvoiceDraft): InvoiceDraft {
  const normalized = withStudioDefaults(normalizeInvoiceDraft(draft));
  const saved = saveStoredInvoice(normalized, { status: "draft" });
  setActiveInvoiceId(saved.id);
  return normalizeInvoiceDraft(saved.draft);
}

export function resetInvoiceDraft(): InvoiceDraft {
  const settings = getStudioSettings();
  const draft = withStudioDefaults({
    ...getDefaultInvoiceDraft(),
    orderId: allocateProjectRef(),
    invoiceNumber: allocateInvoiceNumber(),
    seller: { ...settings.sellerDefaults },
  });
  const saved = saveStoredInvoice(draft, { status: "draft" });
  setActiveInvoiceId(saved.id);
  return normalizeInvoiceDraft(saved.draft);
}

export function loadInvoiceDraft(id: string): InvoiceDraft | null {
  const stored = getStoredInvoice(id);
  if (!stored?.draft) return null;
  setActiveInvoiceId(stored.id);
  return normalizeInvoiceDraft(stored.draft);
}
