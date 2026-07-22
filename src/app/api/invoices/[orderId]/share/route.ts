import { NextResponse } from "next/server";
import { buildInvoiceUrls } from "@/features/invoice/server/invoiceUrls";
import {
  getStoredInvoice,
  markInvoiceIssued,
} from "@/lib/data/invoiceStore";
import { draftToOrder } from "@/lib/demo/invoiceDraft";
import { upsertOrder } from "@/lib/server/orderService";

export async function POST(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const stored = getStoredInvoice(orderId);
    if (!stored) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const issued = markInvoiceIssued(orderId);
    if (!issued) {
      return NextResponse.json({ error: "Unable to issue invoice" }, { status: 500 });
    }

    const order = draftToOrder(issued.draft);
    upsertOrder(order, issued.draft);
    const urls = buildInvoiceUrls(order);

    return NextResponse.json({
      invoice: issued,
      urls,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to issue invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;
  const stored = getStoredInvoice(orderId);
  if (!stored) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  const order = draftToOrder(stored.draft);
  upsertOrder(order, stored.draft);
  const urls = buildInvoiceUrls(order);
  return NextResponse.json({ urls, invoice: stored });
}
