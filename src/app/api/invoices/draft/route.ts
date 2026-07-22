import { NextResponse } from "next/server";
import { buildInvoiceUrls } from "@/features/invoice/server/invoiceUrls";
import { generateInvoiceHtml } from "@/features/invoice/server/generateInvoiceHtml";
import {
  draftToOrder,
  draftToSellerMeta,
  normalizeInvoiceDraft,
} from "@/lib/demo/invoiceDraft";
import { getInvoiceDraft, saveInvoiceDraft } from "@/lib/demo/draftStore";
import { clearInvoiceSellerMetaCache } from "@/features/invoice/server/sellerMeta";
import { upsertOrder } from "@/lib/server/orderService";
import { parseInvoiceDraft } from "@/lib/validation/invoiceDraftSchema";

export async function GET() {
  return NextResponse.json({ draft: getInvoiceDraft() });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { draft?: unknown; persist?: boolean };
    const parsed = parseInvoiceDraft(body.draft);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const normalized = normalizeInvoiceDraft(parsed.draft);
    const draft =
      body.persist === false ? normalized : saveInvoiceDraft(normalized);
    const order = draftToOrder(draft);
    const seller = draftToSellerMeta(draft);

    if (body.persist !== false) {
      upsertOrder(order, draft);
      clearInvoiceSellerMetaCache();
    }

    const invoiceUrls = buildInvoiceUrls(order);
    const pdfPath = `/api/invoices/draft/pdf`;

    const html = generateInvoiceHtml(order, seller, {
      showActions: true,
      downloadUrl: pdfPath,
      content: draft.content,
      returnTo: "/editor",
    });

    return NextResponse.json({
      draft,
      orderId: order.id,
      totals: {
        subtotal: order.subtotal,
        discount: order.couponDiscount,
        shipping: order.shippingCharge,
        platformFee: order.platformFee,
        total: order.total,
      },
      html,
      urls: {
        html:
          invoiceUrls?.html ??
          `/api/invoices/${encodeURIComponent(order.id)}/html`,
        print:
          invoiceUrls?.print ??
          `/api/invoices/${encodeURIComponent(order.id)}/html?print=1`,
        page:
          invoiceUrls?.page ??
          `/orders/${encodeURIComponent(order.id)}/invoice`,
        pdf: pdfPath,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to preview invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
