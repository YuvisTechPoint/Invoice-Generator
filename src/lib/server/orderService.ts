import "server-only";

import { draftToOrder } from "@/lib/demo/invoiceDraft";
import {
  getStoredInvoice,
  listStoredInvoices,
  saveStoredInvoice,
} from "@/lib/data/invoiceStore";
import type { Order } from "@/types/order";
import type { InvoiceDraft } from "@/lib/demo/invoiceDraft";

export async function getOrderById(orderId: string): Promise<Order | null> {
  const stored = getStoredInvoice(orderId);
  if (!stored?.draft) return null;
  return draftToOrder(stored.draft);
}

export function upsertOrder(order: Order, draft?: InvoiceDraft): void {
  if (draft) {
    saveStoredInvoice(
      {
        ...draft,
        orderId: order.id,
        invoiceNumber: order.invoice?.invoiceNumber || draft.invoiceNumber,
        email: order.email,
      },
      {
        status:
          order.paymentStatus === "paid"
            ? "paid"
            : order.paymentStatus === "cod_pending"
              ? "issued"
              : "draft",
      }
    );
    return;
  }

  const existing = getStoredInvoice(order.id);
  if (existing?.draft) {
    saveStoredInvoice(
      {
        ...existing.draft,
        orderId: order.id,
        invoiceNumber: order.invoice?.invoiceNumber || existing.invoiceNumber,
        email: order.email,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
      {
        status:
          order.paymentStatus === "paid"
            ? "paid"
            : existing.status === "void"
              ? "void"
              : "issued",
      }
    );
  }
}

export function listOrders(): Order[] {
  return listStoredInvoices()
    .map((item) => getStoredInvoice(item.id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r?.draft))
    .map((r) => draftToOrder(r.draft));
}
