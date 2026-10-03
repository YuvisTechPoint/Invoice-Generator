import type { InvoiceStatusBadge } from "@/features/invoice/types";
import { isPlacedOrder, orderNeedsPlacementRefresh } from "@/lib/orderPlacement";
import type { Order, PaymentStatus } from "@/types/order";
import { formatInvoiceDate, formatInvoiceDateTime } from "@/features/invoice/utils/format";

/** Invoice is available when issued in the generator, or fully placed for legacy orders. */
export function isInvoiceAvailable(order: {
  invoice?: Order["invoice"] | null;
  paymentStatus: PaymentStatus;
}): boolean {
  if (order.invoice?.invoiceNumber?.trim()) {
    return true;
  }
  return isPlacedOrder(order);
}

export function withInvoiceReturnTo(url: string, returnTo: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

/** Poll while payment verification or invoice issuance may still be in progress. */
export function orderNeedsInvoiceRefresh(order: {
  paymentStatus: Order["paymentStatus"];
  status?: Order["status"];
  invoice?: Order["invoice"] | null;
}): boolean {
  return orderNeedsPlacementRefresh(order);
}

/** Invoice brand tokens for HTML output. */
export const INVOICE_BRAND = {
  teal: "#1253ED",
  tealDark: "#0f3f99",
  cyan: "#0CC0DF",
  yellow: "#FFDE59",
  gold: "#c9a227",
} as const;

export function amountInWordsInr(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ] as const;

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ] as const;

  function twoDigits(n: number): string {
    if (n < 20) return ones[n] ?? "";
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
  }

  function threeDigits(n: number): string {
    if (n === 0) return "";
    if (n < 100) return twoDigits(n);
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return `${ones[h]} Hundred${rest ? ` ${twoDigits(rest)}` : ""}`;
  }

  function indianNumberWords(n: number): string {
    if (n === 0) return "Zero";

    const parts: string[] = [];
    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const hundred = n % 1000;

    if (crore) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
    if (hundred) parts.push(threeDigits(hundred));

    return parts.join(" ");
  }

  let words = indianNumberWords(rupees);
  words = words ? `${words} Rupees` : "Zero Rupees";

  if (paise > 0) {
    words += ` and ${twoDigits(paise)} Paise`;
  }

  return `${words} Only`;
}

export function paymentMethodLabel(method: string): string {
  if (method === "upi") return "UPI";
  if (method === "net_banking") return "Net Banking";
  if (method === "razorpay") return "Razorpay — UPI / Card / Net Banking";
  if (method === "cod") return "Due on milestone";
  return method;
}

export function invoicePaymentDateLabel(order: { payment: { paidAt?: string; method: string }; status: string }): string {
  if (order.payment.paidAt) return formatInvoiceDate(order.payment.paidAt);
  if (order.payment.method === "cod") return "Pay on delivery";
  return "Pending";
}

export function invoiceStatusBadge(order: {
  status: string;
  paymentStatus: string;
  paymentMethod: string;
}): InvoiceStatusBadge {
  if (order.paymentStatus === "paid") return { label: "PAID", tone: "paid" };
  if (order.paymentMethod === "cod" && order.paymentStatus === "cod_pending")
    return { label: "COD", tone: "cod" };
  return { label: "PENDING", tone: "pending" };
}

export { formatInvoiceDate, formatInvoiceDateTime };

