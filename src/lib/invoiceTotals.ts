export const SELLER_STATE = "Maharashtra";

export interface InvoiceLineItem {
  productId: string;
  name: string;
  quantity: number;
  /** Unit price (INR). */
  unitPrice: number;
}

export interface InvoiceTotalsInput {
  items: InvoiceLineItem[];
  couponDiscount: number;
  shippingCharge: number;
  platformFee?: number;
  sellerState: string;
  buyerState: string;
}

export interface InvoiceLineBreakdown {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  discountShare: number;
  lineTotal: number;
}

export interface InvoiceData {
  subtotal: number;
  couponDiscount: number;
  shippingCharge: number;
  platformFee: number;
  lineBreakdown: InvoiceLineBreakdown[];
  grandTotal: number;
  sellerState: string;
  buyerState: string;
  invoiceNumber: string;
  invoiceDate: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${datePart}-${randomPart}`;
}

/**
 * Calculates invoice totals for a cart.
 * Discount is allocated proportionally across line items.
 */
export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceData {
  const {
    items,
    couponDiscount,
    shippingCharge,
    platformFee = 0,
    sellerState,
    buyerState,
  } = input;

  const subtotal = round2(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );
  const cappedDiscount = Math.min(Math.max(couponDiscount, 0), subtotal);

  const lineBreakdown: InvoiceLineBreakdown[] = items.map((item) => {
    const lineSubtotal = round2(item.unitPrice * item.quantity);
    const discountShare =
      subtotal > 0
        ? round2((lineSubtotal / subtotal) * cappedDiscount)
        : 0;
    const lineTotal = round2(lineSubtotal - discountShare);

    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineSubtotal,
      discountShare,
      lineTotal,
    };
  });

  const itemsGross = round2(
    lineBreakdown.reduce((sum, line) => sum + line.lineTotal, 0)
  );
  const grandTotal = round2(
    itemsGross + round2(shippingCharge) + round2(platformFee)
  );

  return {
    subtotal,
    couponDiscount: cappedDiscount,
    shippingCharge: round2(shippingCharge),
    platformFee: round2(platformFee),
    lineBreakdown,
    grandTotal,
    sellerState,
    buyerState,
    invoiceNumber: generateInvoiceNumber(),
    invoiceDate: new Date().toISOString(),
  };
}

/** Convert INR to paise for Razorpay. */
export function toPaise(amountInr: number): number {
  return Math.round(amountInr * 100);
}

/**
 * Shipping is free for all storefront/checkout orders.
 * Threshold kept at 0 so legacy “add more for free shipping” UIs stay satisfied.
 */
export const FREE_SHIPPING_THRESHOLD = 0;
export const STANDARD_SHIPPING_CHARGE = 0;

export function getShippingCharge(
  _subtotal: number,
  _discount: number
): number {
  return 0;
}
