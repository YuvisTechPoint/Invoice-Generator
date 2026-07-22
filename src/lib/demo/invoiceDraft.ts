import {
  calculateInvoiceTotals,
  SELLER_STATE,
} from "@/lib/invoiceTotals";
import {
  DEFAULT_INVOICE_CONTENT,
  mergeInvoiceContent,
  type InvoiceSectionContent,
} from "@/features/invoice/invoiceContent";
import { BRAND } from "@/lib/brand";
import { lineFromTemplate, SERVICE_TEMPLATES } from "@/lib/demo/serviceCatalog";
import type { InvoiceSellerMeta } from "@/features/invoice/types";
import type { Order, PaymentMethod, PaymentStatus } from "@/types/order";

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
] as const;

export type InvoiceDraftLine = {
  id: string;
  productId: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceDraft = {
  orderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  orderDate: string;
  /** Payment due date (YYYY-MM-DD) */
  dueDate: string;
  /** e.g. Net 15, 50% advance */
  paymentTerms: string;
  /** Date payment was received (YYYY-MM-DD); blank when unpaid */
  paidOnDate: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  couponCode: string;
  couponDiscount: number;
  shippingCharge: number;
  platformFee: number;
  email: string;
  customerPhone: string;
  seller: {
    storeName: string;
    legalName: string;
    tagline: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    gstin: string;
    pan: string;
    state: string;
    stateCode: string;
  };
  shippingAddress: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  items: InvoiceDraftLine[];
  content: InvoiceSectionContent;
};

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyLine(): InvoiceDraftLine {
  return {
    id: uid("line"),
    productId: uid("svc"),
    name: "",
    variantLabel: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function nextProjectRef(datePart: string): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PRJ-${datePart}-${suffix}`;
}

function nextInvoiceNumber(datePart: string): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${datePart}-${suffix}`;
}

function addDaysIso(dateOnly: string, days: number): string {
  const base = new Date(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return dateOnly;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Fresh client invoice draft for website / software development work. */
export function getDefaultInvoiceDraft(): InvoiceDraft {
  const now = new Date();
  const iso = now.toISOString();
  const datePart = iso.slice(0, 10).replace(/-/g, "");
  const invoiceDate = iso.slice(0, 10);
  const design = SERVICE_TEMPLATES.find((t) => t.id === "web-design")!;
  const build = SERVICE_TEMPLATES.find((t) => t.id === "web-dev")!;
  const hosting = SERVICE_TEMPLATES.find((t) => t.id === "hosting")!;
  const items = [
    lineFromTemplate(design),
    lineFromTemplate(build),
    lineFromTemplate(hosting),
  ];
  const grandTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return {
    orderId: nextProjectRef(datePart),
    invoiceNumber: nextInvoiceNumber(datePart),
    invoiceDate,
    orderDate: invoiceDate,
    dueDate: addDaysIso(invoiceDate, 15),
    paymentTerms: "Net 7 — balance due within 15 days of invoice date",
    paidOnDate: invoiceDate,
    paymentMethod: "upi",
    paymentStatus: "paid",
    couponCode: "",
    couponDiscount: 0,
    shippingCharge: 0,
    platformFee: 0,
    email: "accounts@acmecorp.in",
    customerPhone: "+91 98111 22334",
    seller: {
      storeName: BRAND.name,
      legalName: `M/S ${BRAND.name.toUpperCase()}`,
      tagline: BRAND.tagline,
      address: "Andheri East\nMumbai, Maharashtra, 400069",
      email: BRAND.email,
      phone: BRAND.phoneDisplay,
      website: `https://${BRAND.domain}/`,
      gstin: "27AAAAA0000A1Z5",
      pan: "AAAAA0000A",
      state: SELLER_STATE,
      stateCode: "27",
    },
    shippingAddress: {
      name: "Acme Retail Pvt. Ltd.",
      line1: "402, Horizon Towers",
      line2: "BKC",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400051",
      country: "India",
      phone: "+91 98111 22334",
    },
    items,
    content: {
      ...DEFAULT_INVOICE_CONTENT,
      signatoryForLabel: `For ${(`M/S ${BRAND.name.toUpperCase()}`)}`,
      amountPaidValue: grandTotal,
      amountDueValue: 0,
      settlementStatus: "paid",
    },
  };
}

export function normalizeInvoiceDraft(
  draft: Partial<InvoiceDraft> | InvoiceDraft
): InvoiceDraft {
  const defaults = getDefaultInvoiceDraft();
  const merged = {
    ...defaults,
    ...draft,
    seller: { ...defaults.seller, ...(draft.seller ?? {}) },
    shippingAddress: {
      ...defaults.shippingAddress,
      ...(draft.shippingAddress ?? {}),
    },
    items:
      Array.isArray(draft.items) && draft.items.length > 0
        ? draft.items.map((item) => ({ ...createEmptyLine(), ...item }))
        : defaults.items,
    content: mergeInvoiceContent(draft.content),
  };

  if (!merged.dueDate?.trim()) {
    merged.dueDate = addDaysIso(merged.invoiceDate.slice(0, 10), 15);
  }
  if (!merged.paymentTerms?.trim()) {
    merged.paymentTerms = defaults.paymentTerms;
  }
  if (merged.paymentStatus === "paid" && !merged.paidOnDate?.trim()) {
    merged.paidOnDate = merged.invoiceDate.slice(0, 10);
  }
  if (/\(\s*client\s*\)/i.test(merged.content.billToHeading)) {
    merged.content = {
      ...merged.content,
      billToHeading:
        merged.content.billToHeading.replace(/\(\s*client\s*\)/gi, "").trim() ||
        "Bill To",
    };
  }
  // Headings only: left = Service Provider, right = Bill To (content unchanged).
  if (
    /^bill to$/i.test(merged.content.soldByHeading.trim()) &&
    /^service provider$/i.test(merged.content.billToHeading.trim())
  ) {
    merged.content = {
      ...merged.content,
      soldByHeading: "Service Provider",
      billToHeading: "Bill To",
    };
  }

  return merged;
}

function toIsoDate(dateOnly: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return new Date(`${dateOnly}T12:00:00.000Z`).toISOString();
  }
  const parsed = new Date(dateOnly);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

export function draftToSellerMeta(draft: InvoiceDraft): InvoiceSellerMeta {
  return {
    storeName: draft.seller.storeName.trim() || BRAND.name,
    legalName:
      draft.seller.legalName.trim() ||
      draft.seller.storeName.trim() ||
      BRAND.name,
    tagline: draft.seller.tagline.trim() || undefined,
    address: draft.seller.address.trim(),
    email: draft.seller.email.trim(),
    phone: draft.seller.phone.trim(),
    website: draft.seller.website.trim() || undefined,
    gstin: draft.seller.gstin.trim() || undefined,
    pan: draft.seller.pan.trim() || undefined,
    state: draft.seller.state.trim() || SELLER_STATE,
    stateCode: draft.seller.stateCode.trim(),
  };
}

export function draftToOrder(draft: InvoiceDraft): Order {
  const sellerState = draft.seller.state.trim() || SELLER_STATE;
  const buyerState = draft.shippingAddress.state.trim() || sellerState;

  const totals = calculateInvoiceTotals({
    items: draft.items
      .filter((item) => item.name.trim() && item.quantity > 0)
      .map((item) => ({
        productId: item.productId || uid("svc"),
        name: item.name.trim(),
        quantity: Math.max(1, Math.floor(item.quantity) || 1),
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      })),
    couponDiscount: Math.max(0, Number(draft.couponDiscount) || 0),
    shippingCharge: Math.max(0, Number(draft.shippingCharge) || 0),
    platformFee: Math.max(0, Number(draft.platformFee) || 0),
    sellerState,
    buyerState,
  });

  const invoiceDate = toIsoDate(draft.invoiceDate);
  const orderDate = toIsoDate(draft.orderDate);
  const dueDateRaw = (draft.dueDate ?? "").trim();
  const dueDateIso = dueDateRaw
    ? toIsoDate(dueDateRaw)
    : toIsoDate(addDaysIso(invoiceDate.slice(0, 10), 15));
  const paidOnRaw = (draft.paidOnDate ?? "").trim();
  const paidOnIso =
    draft.paymentStatus === "paid"
      ? paidOnRaw
        ? toIsoDate(paidOnRaw)
        : invoiceDate
      : paidOnRaw
        ? toIsoDate(paidOnRaw)
        : undefined;

  return {
    id: draft.orderId.trim() || nextProjectRef(invoiceDate.slice(0, 10).replace(/-/g, "")),
    userId: "studio-user",
    email: draft.email.trim().toLowerCase() || "client@example.com",
    customerName: draft.shippingAddress.name.trim(),
    customerPhone:
      draft.customerPhone.trim() || draft.shippingAddress.phone.trim(),
    status: "confirmed",
    paymentStatus: draft.paymentStatus,
    paymentMethod: draft.paymentMethod,
    subtotal: totals.subtotal,
    couponCode: draft.couponCode.trim() || null,
    couponDiscount: totals.couponDiscount,
    shippingCharge: totals.shippingCharge,
    platformFee: totals.platformFee,
    total: totals.grandTotal,
    items: draft.items
      .filter((item) => item.name.trim() && item.quantity > 0)
      .map((item) => ({
        productId: item.productId || uid("svc"),
        name: item.name.trim(),
        variantLabel: item.variantLabel.trim() || undefined,
        quantity: Math.max(1, Math.floor(item.quantity) || 1),
        price: Math.max(0, Number(item.unitPrice) || 0),
      })),
    shippingAddress: {
      name: draft.shippingAddress.name.trim() || "Client",
      line1: draft.shippingAddress.line1.trim() || "—",
      line2: draft.shippingAddress.line2.trim() || undefined,
      city: draft.shippingAddress.city.trim() || "—",
      state: buyerState,
      postalCode: draft.shippingAddress.postalCode.trim() || "000000",
      country: draft.shippingAddress.country.trim() || "India",
      phone: draft.shippingAddress.phone.trim() || undefined,
    },
    invoice: {
      ...totals,
      invoiceNumber: draft.invoiceNumber.trim() || totals.invoiceNumber,
      invoiceDate,
    },
    paymentCompletedAt: paidOnIso,
    dueDate: dueDateIso,
    paymentTerms: (draft.paymentTerms ?? "").trim(),
    createdAt: orderDate,
    updatedAt: new Date().toISOString(),
  };
}
