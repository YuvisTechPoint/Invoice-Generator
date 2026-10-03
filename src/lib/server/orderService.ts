import "server-only";

import { draftToOrder } from "@/lib/demo/invoiceDraft";
import {
  getStoredInvoice,
  listStoredInvoices,
  saveStoredInvoice,
  type InvoiceStatus,
} from "@/lib/data/invoiceStore";
import type { Order } from "@/types/order";
import type { InvoiceDraft } from "@/lib/demo/invoiceDraft";

function preserveStatusOnSave(
  order: Order,
  existing: Awaited<ReturnType<typeof getStoredInvoice>>
): InvoiceStatus | undefined {
  if (!existing) return "draft";
  if (existing.status === "void") return "void";
  if (existing.status === "paid") return "paid";
  if (existing.status === "issued") return "issued";
  if (order.paymentStatus === "paid") return "paid";
  return existing.status;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const stored = await getStoredInvoice(orderId);
  if (!stored?.draft) return null;
  return draftToOrder(stored.draft);
}

export async function upsertOrder(order: Order, draft?: InvoiceDraft): Promise<void> {
  const existing = await getStoredInvoice(order.id);

  if (draft) {
    await saveStoredInvoice(
      {
        ...draft,
        orderId: order.id,
        invoiceNumber: order.invoice?.invoiceNumber || draft.invoiceNumber,
        email: order.email,
      },
      { status: preserveStatusOnSave(order, existing) }
    );
    return;
  }

  if (existing?.draft) {
    await saveStoredInvoice(
      {
        ...existing.draft,
        orderId: order.id,
        invoiceNumber: order.invoice?.invoiceNumber || existing.invoiceNumber,
        email: order.email,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
      { status: preserveStatusOnSave(order, existing) }
    );
  }
}

export async function listOrders(): Promise<Order[]> {
  const items = await listStoredInvoices();
  const orders: Order[] = [];
  for (const item of items) {
    const stored = await getStoredInvoice(item.id);
    if (stored?.draft) {
      orders.push(draftToOrder(stored.draft));
    }
  }
  return orders;
}
