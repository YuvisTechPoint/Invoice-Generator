import "server-only";
import type { InvoiceDraft } from "@/lib/demo/invoiceDraft";
import {
  atomicWriteJson,
  getInvoicesDir,
  readJsonFile,
} from "@/lib/data/paths";
import path from "node:path";
import fs from "node:fs";

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

function fileFor(id: string): string {
  const safe = id.replace(/[^\w.-]+/g, "_");
  return path.join(getInvoicesDir(), `${safe}.json`);
}

export function listStoredInvoices(): InvoiceListItem[] {
  const dir = getInvoicesDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const items: InvoiceListItem[] = [];

  for (const file of files) {
    const full = path.join(dir, file);
    const record = readJsonFile<StoredInvoice | null>(full, null);
    if (!record?.draft) continue;
    const total = record.draft.items.reduce(
      (sum, item) =>
        sum +
        Math.max(0, Number(item.unitPrice) || 0) *
          Math.max(0, Number(item.quantity) || 0),
      0
    );
    const discount = Math.max(0, Number(record.draft.couponDiscount) || 0);
    items.push({
      id: record.id,
      invoiceNumber: record.invoiceNumber,
      status: record.status,
      clientName: record.clientName,
      clientEmail: record.clientEmail,
      total: Math.max(0, total - discount),
      invoiceDate: record.draft.invoiceDate,
      updatedAt: record.updatedAt,
    });
  }

  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getStoredInvoice(id: string): StoredInvoice | null {
  return readJsonFile<StoredInvoice | null>(fileFor(id), null);
}

export function saveStoredInvoice(
  draft: InvoiceDraft,
  options?: { status?: InvoiceStatus; issuedAt?: string }
): StoredInvoice {
  const now = new Date().toISOString();
  const existing = getStoredInvoice(draft.orderId);
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
  atomicWriteJson(fileFor(record.id), record);
  return record;
}

export function deleteStoredInvoice(id: string): boolean {
  const file = fileFor(id);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

export function markInvoiceIssued(id: string): StoredInvoice | null {
  const existing = getStoredInvoice(id);
  if (!existing) return null;
  return saveStoredInvoice(existing.draft, {
    status: existing.status === "paid" ? "paid" : "issued",
    issuedAt: existing.issuedAt ?? new Date().toISOString(),
  });
}
