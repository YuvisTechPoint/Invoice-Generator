import { z } from "zod";
import type { InvoiceDraft } from "@/lib/demo/invoiceDraft";

const lineSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  name: z.string(),
  variantLabel: z.string(),
  quantity: z.number().finite().min(0).max(1_000_000),
  unitPrice: z.number().finite().min(0).max(100_000_000),
});

const contentSchema = z
  .object({
    logoImageDataUrl: z.string().max(2_500_000).optional(),
    signatoryImageDataUrl: z.string().max(2_500_000).optional(),
  })
  .passthrough();

export const invoiceDraftSchema = z.object({
  orderId: z.string().min(1).max(80),
  invoiceNumber: z.string().min(1).max(80),
  invoiceDate: z.string().min(4).max(40),
  orderDate: z.string().min(4).max(40),
  dueDate: z.string().max(40).optional().default(""),
  paymentTerms: z.string().max(500).optional().default(""),
  paidOnDate: z.string().max(40).optional().default(""),
  paymentMethod: z.enum(["razorpay", "upi", "net_banking", "cod"]),
  paymentStatus: z.enum([
    "pending",
    "paid",
    "failed",
    "cod_pending",
    "refunded",
  ]),
  couponCode: z.string().max(80),
  couponDiscount: z.number().finite().min(0).max(100_000_000),
  shippingCharge: z.number().finite().min(0).max(100_000_000),
  platformFee: z.number().finite().min(0).max(100_000_000),
  email: z.string().max(200),
  customerPhone: z.string().max(80),
  seller: z.object({
    storeName: z.string().max(200),
    legalName: z.string().max(200),
    tagline: z.string().max(400),
    address: z.string().max(2000),
    email: z.string().max(200),
    phone: z.string().max(80),
    website: z.string().max(300),
    gstin: z.string().max(40),
    pan: z.string().max(20),
    state: z.string().max(80),
    stateCode: z.string().max(10),
  }),
  shippingAddress: z.object({
    name: z.string().max(200),
    line1: z.string().max(300),
    line2: z.string().max(300),
    city: z.string().max(120),
    state: z.string().max(80),
    postalCode: z.string().max(20),
    country: z.string().max(80),
    phone: z.string().max(80),
  }),
  items: z.array(lineSchema).min(1).max(200),
  content: contentSchema,
});

export function parseInvoiceDraft(value: unknown): {
  ok: true;
  draft: InvoiceDraft;
} | {
  ok: false;
  error: string;
} {
  const result = invoiceDraftSchema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: first
        ? `${first.path.join(".") || "draft"}: ${first.message}`
        : "Invalid invoice draft",
    };
  }
  return { ok: true, draft: result.data as InvoiceDraft };
}
