import { draftToOrder, getDefaultInvoiceDraft } from "@/lib/demo/invoiceDraft";
import type { Order } from "@/types/order";

/** @deprecated Prefer getDefaultInvoiceDraft + draftToOrder */
export function getDemoOrder(): Order {
  return draftToOrder(getDefaultInvoiceDraft());
}

export const DEMO_ORDER_ID = "demo-order-001";
