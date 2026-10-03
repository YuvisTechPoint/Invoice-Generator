import { NextResponse } from "next/server";
import { guardStudioApi } from "@/lib/api/guards";
import { buildInvoiceUrls } from "@/features/invoice/server/invoiceUrls";
import { generateInvoiceHtml } from "@/features/invoice/server/generateInvoiceHtml";
import { appendQueryParam, routes } from "@/lib/routes";
import {
  draftToOrder,
  draftToSellerMeta,
  normalizeInvoiceDraft,
} from "@/lib/demo/invoiceDraft";
import { getInvoiceDraft, saveInvoiceDraft } from "@/lib/demo/draftStore";
import { clearInvoiceSellerMetaCache } from "@/features/invoice/server/sellerMeta";
import { upsertOrder } from "@/lib/server/orderService";
import { parseInvoiceDraft } from "@/lib/validation/invoiceDraftSchema";

export async function GET(request: Request) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;
  return NextResponse.json({ draft: await getInvoiceDraft() });
}

export async function PUT(request: Request) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as { draft?: unknown; persist?: boolean };
    const parsed = parseInvoiceDraft(body.draft);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const normalized = normalizeInvoiceDraft(parsed.draft);
    const draft =
      body.persist === false
        ? normalized
        : await saveInvoiceDraft(normalized);
    const order = draftToOrder(draft);
    const seller = draftToSellerMeta(draft);

    if (body.persist !== false) {
      await upsertOrder(order, draft);
      clearInvoiceSellerMetaCache();
    }

    const invoiceUrls = buildInvoiceUrls(order);
    const pdfPath = `/api/invoices/draft/pdf`;
    const editorReturn = routes.editor(order.id);
    const baseHtml =
      invoiceUrls?.html ??
      `/api/invoices/${encodeURIComponent(order.id)}/html`;
    const htmlPath = appendQueryParam(baseHtml, "returnTo", editorReturn);
    const basePrint = invoiceUrls?.print ?? `${baseHtml}${baseHtml.includes("?") ? "&" : "?"}print=1`;
    const printPath = appendQueryParam(basePrint, "returnTo", editorReturn);

    const html = generateInvoiceHtml(order, seller, {
      showActions: true,
      downloadUrl: pdfPath,
      content: draft.content,
      returnTo: editorReturn,
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
        html: htmlPath,
        print: printPath,
        page:
          invoiceUrls?.page ??
          routes.invoicePage(order.id, editorReturn),
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
