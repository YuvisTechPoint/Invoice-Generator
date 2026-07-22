import "server-only";

import { getSessionUser } from "@/lib/auth/server-session";
import { getAdminSession } from "@/lib/server/adminService";
import { getOrderById } from "@/lib/server/orderService";
import { verifyInvoiceAccessToken } from "@/lib/security/invoiceAccessToken";
import type { Order } from "@/types/order";
import { isInvoiceAvailable } from "@/features/invoice/utils/invoice-utils";

export type InvoiceOrderErrorCode =
  | "not_found"
  | "unauthorized"
  | "not_available"
  | "missing_data";

export type InvoiceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; code: InvoiceOrderErrorCode; message: string };

export async function resolveInvoiceOrder(
  orderId: string,
  email?: string,
  token?: string
): Promise<InvoiceOrderResult> {
  const normalizedEmail = email?.trim().toLowerCase();

  if (token && verifyInvoiceAccessToken(token, orderId, normalizedEmail)) {
    const order = await getOrderById(orderId);
    if (!order) {
      return { ok: false, code: "not_found", message: "Order not found" };
    }
    return validateInvoiceOrder(order);
  }

  // Email alone is not authorization — require a signed token for guests,
  // or an authenticated session that owns the order (or admin).
  if (normalizedEmail && !token) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Invoice access token required",
    };
  }

  const sessionUser = await getSessionUser();
  if (sessionUser) {
    const order = await getOrderById(orderId);
    if (!order) {
      return { ok: false, code: "not_found", message: "Order not found" };
    }
    // Authenticated studio operators can open any stored invoice.
    if (sessionUser.uid === "studio-user") {
      return validateInvoiceOrder(order);
    }

    const owns =
      order.userId === sessionUser.uid ||
      (sessionUser.email &&
        order.email.toLowerCase() === sessionUser.email.toLowerCase());

    if (!owns) {
      const adminSession = await getAdminSession(sessionUser.uid);
      if (!adminSession) {
        return { ok: false, code: "not_found", message: "Order not found" };
      }
    }

    return validateInvoiceOrder(order);
  }

  return {
    ok: false,
    code: "unauthorized",
    message: "Authentication required",
  };
}

function validateInvoiceOrder(order: Order): InvoiceOrderResult {
  if (!isInvoiceAvailable(order)) {
    return {
      ok: false,
      code: "not_available",
      message: "Invoice not available for this order yet",
    };
  }

  if (!order.invoice) {
    return {
      ok: false,
      code: "missing_data",
      message: "Invoice data missing",
    };
  }

  return { ok: true, order };
}

export function invoiceOrderErrorStatus(code: InvoiceOrderErrorCode): number {
  switch (code) {
    case "unauthorized":
      return 401;
    case "not_available":
      return 403;
    case "missing_data":
      return 404;
    case "not_found":
    default:
      return 404;
  }
}

export function isInvoicePdfEnabled(): boolean {
  const flag =
    process.env.NEXT_PUBLIC_INVOICE_PDF_ENABLED ??
    process.env.INVOICE_PDF_ENABLED;
  if (flag === undefined || flag === "") return true;
  return flag === "true" || flag === "1";
}
