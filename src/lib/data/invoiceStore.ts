import "server-only";
import { draftToOrder } from "@/lib/demo/invoiceDraft";
import type { InvoiceDraft } from "@/lib/demo/invoiceDraft";
import {
  INVOICE_STORAGE_PREFIX,
  deleteStorageKey,
  invoiceStorageKey,
  listStorageKeys,
  readStorageJson,
  writeStorageJson,
} from "@/lib/data/jsonStorage";

export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export type StoredInvoice = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientName: string;
  clientEmail: string;
  draft: InvoiceDraft;
  createdAt: string;
  updatedAt: string;
  issuedAt?: string;
};

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientName: string;
  clientEmail: string;
  total: number;
  invoiceDate: string;
  updatedAt: string;
};

export async function listStoredInvoices(): Promise<InvoiceListItem[]> {
  const keys = await listStorageKeys(INVOICE_STORAGE_PREFIX);
  const items: InvoiceListItem[] = [];

  for (const key of keys) {
    const record = await readStorageJson<StoredInvoice | null>(key, null);
    if (!record?.draft) continue;
    const order = draftToOrder(record.draft);
    items.push({
      id: record.id,
      invoiceNumber: record.invoiceNumber,
      status: record.status,
      clientName: record.clientName,
      clientEmail: record.clientEmail,
      total: order.total,
      invoiceDate: record.draft.invoiceDate,
      updatedAt: record.updatedAt,
    });
  }

  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getStoredInvoice(id: string): Promise<StoredInvoice | null> {
  return readStorageJson<StoredInvoice | null>(invoiceStorageKey(id), null);
}

export async function saveStoredInvoice(
  draft: InvoiceDraft,
  options?: { status?: InvoiceStatus; issuedAt?: string }
): Promise<StoredInvoice> {
  const now = new Date().toISOString();
  const existing = await getStoredInvoice(draft.orderId);
  const record: StoredInvoice = {
    id: draft.orderId,
    invoiceNumber: draft.invoiceNumber,
    status: options?.status ?? existing?.status ?? "draft",
    clientName: draft.shippingAddress.name.trim() || "Client",
    clientEmail: draft.email.trim().toLowerCase() || "client@example.com",
    draft,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    issuedAt: options?.issuedAt ?? existing?.issuedAt,
  };
  await writeStorageJson(invoiceStorageKey(record.id), record);
  return record;
}

export async function deleteStoredInvoice(id: string): Promise<boolean> {
  const existing = await getStoredInvoice(id);
  if (!existing) return false;
  return deleteStorageKey(invoiceStorageKey(id));
}

export async function markInvoiceIssued(id: string): Promise<StoredInvoice | null> {
  const existing = await getStoredInvoice(id);
  if (!existing) return null;
  return saveStoredInvoice(existing.draft, {
    status: existing.status === "paid" ? "paid" : "issued",
    issuedAt: existing.issuedAt ?? new Date().toISOString(),
  });
}
