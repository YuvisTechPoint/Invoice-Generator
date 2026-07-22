import type { Order, PaymentMethod, PaymentStatus } from "@/types/order";
import type { InvoiceData } from "@/lib/invoiceTotals";

export type InvoiceTone = "paid" | "cod" | "pending";

export interface InvoiceSellerMeta {
  storeName: string;
  legalName: string;
  tagline?: string;
  address: string;
  email: string;
  phone: string;
  website?: string;
  gstin?: string;
  pan?: string;
  state: string;
  stateCode: string;
}

export interface InvoiceStatusBadge {
  label: string;
  tone: InvoiceTone;
}

export interface InvoicePaymentMeta {
  method: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: string;
}

export interface InvoiceSafeOrder {
  order: Order & { invoice?: InvoiceData };
  invoice: InvoiceData;
}

export type InvoiceUrls = {
  html: string;
  pdf?: string;
  print: string;
  page: string;
};
