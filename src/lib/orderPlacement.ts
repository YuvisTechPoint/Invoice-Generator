import type { Order, PaymentStatus } from "@/types/order";

/** Online payment captured, COD accepted, or a refunded order that was previously paid. */
export function isPaymentVerified(order: { paymentStatus: PaymentStatus }): boolean {
  return (
    order.paymentStatus === "paid" ||
    order.paymentStatus === "cod_pending" ||
    order.paymentStatus === "refunded"
  );
}

export function isInvoiceGenerated(order: {
  invoice?: Order["invoice"] | null;
}): boolean {
  return Boolean(order.invoice?.invoiceNumber);
}

/**
 * An order is placed only after payment is verified and an invoice has been issued.
 * Unpaid Razorpay checkouts are never treated as placed, even if totals were reserved.
 */
export function isPlacedOrder(order: {
  paymentStatus: PaymentStatus;
  invoice?: Order["invoice"] | null;
}): boolean {
  if (order.paymentStatus === "pending" || order.paymentStatus === "failed") {
    return false;
  }

  if (!isInvoiceGenerated(order)) {
    return false;
  }

  return isPaymentVerified(order);
}

/** Poll until the order is fully placed (payment verified + invoice issued). */
export function orderNeedsPlacementRefresh(order: {
  paymentStatus: PaymentStatus;
  status?: Order["status"];
  invoice?: Order["invoice"] | null;
}): boolean {
  if (order.paymentStatus === "failed" || order.status === "cancelled") {
    return false;
  }
  return !isPlacedOrder(order);
}
