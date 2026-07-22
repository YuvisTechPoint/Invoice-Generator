import { NextResponse } from "next/server";
import { generateInvoiceHtml } from "@/features/invoice/server/generateInvoiceHtml";
import { enqueueInvoicePdf } from "@/lib/invoice/pdfQueue";
import { buildInvoiceDownloadFilename } from "@/features/invoice/server/invoiceUrls";
import {
  draftToOrder,
  draftToSellerMeta,
  normalizeInvoiceDraft,
  type InvoiceDraft,
} from "@/lib/demo/invoiceDraft";
import { getInvoiceDraft, saveInvoiceDraft } from "@/lib/demo/draftStore";
import { parseInvoiceDraft } from "@/lib/validation/invoiceDraftSchema";
import { upsertOrder } from "@/lib/server/orderService";

async function buildPdfResponse(draftInput?: InvoiceDraft) {
  const draft = draftInput
    ? saveInvoiceDraft(normalizeInvoiceDraft(draftInput))
    : getInvoiceDraft();
  const order = draftToOrder(draft);
  const seller = draftToSellerMeta(draft);

  upsertOrder(order, draft);

  const html = generateInvoiceHtml(order, seller, {
    showActions: false,
    content: draft.content,
  });

  const pdfResult = await enqueueInvoicePdf(html);
  if (!pdfResult.ok) {
    return NextResponse.json(
      {
        error:
          pdfResult.reason ||
          "PDF generation failed. Ensure Puppeteer is installed.",
      },
      { status: 503 }
    );
  }

  const filename = buildInvoiceDownloadFilename(order);
  const pdfBytes = new Uint8Array(pdfResult.buffer);
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Invoice-Pdf-Engine": pdfResult.engine,
    },
  });
}

export async function GET() {
  try {
    return await buildPdfResponse();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to generate PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      draft?: unknown;
    };
    if (body.draft) {
      const parsed = parseInvoiceDraft(body.draft);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      return await buildPdfResponse(normalizeInvoiceDraft(parsed.draft));
    }
    return await buildPdfResponse();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to generate PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
