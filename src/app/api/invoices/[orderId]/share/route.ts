import { NextResponse } from "next/server";
import { guardStudioApi } from "@/lib/api/guards";
import { canIssueClientShareLinks } from "@/lib/config/env";
import { buildInvoiceUrls } from "@/features/invoice/server/invoiceUrls";
import {
  getStoredInvoice,
  markInvoiceIssued,
} from "@/lib/data/invoiceStore";
import { draftToOrder } from "@/lib/demo/invoiceDraft";
import { upsertOrder } from "@/lib/server/orderService";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  try {
    const { orderId } = await context.params;
    const stored = await getStoredInvoice(orderId);
    if (!stored) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (stored.status === "void") {
      return NextResponse.json({ error: "Void invoices cannot be issued" }, { status: 400 });
    }

    if (!canIssueClientShareLinks()) {
      return NextResponse.json(
        {
          error:
            "Client share links require INVOICE_ACCESS_SECRET (min 16 chars). Set it in your environment.",
        },
        { status: 503 }
      );
    }

    const issued = await markInvoiceIssued(orderId);
    if (!issued) {
      return NextResponse.json({ error: "Unable to issue invoice" }, { status: 500 });
    }

    const order = draftToOrder(issued.draft);
    await upsertOrder(order, issued.draft);
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
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  const { orderId } = await context.params;
  const stored = await getStoredInvoice(orderId);
  if (!stored) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  const order = draftToOrder(stored.draft);
  await upsertOrder(order, stored.draft);
  const urls = buildInvoiceUrls(order);
  return NextResponse.json({ urls, invoice: stored });
}
