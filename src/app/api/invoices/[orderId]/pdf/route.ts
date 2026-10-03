import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/api/route-utils";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { getInvoiceSellerMetaForOrder } from "@/features/invoice/server/sellerMeta";
import { generateInvoiceHtml } from "@/features/invoice/server/generateInvoiceHtml";
import { enqueueInvoicePdf } from "@/lib/invoice/pdfQueue";
import { buildInvoiceDownloadFilename } from "@/features/invoice/server/invoiceUrls";
import {
  invoiceOrderErrorStatus,
  isInvoicePdfEnabled,
  resolveInvoiceOrder,
} from "@/features/invoice/server/resolveInvoiceOrder";
import { getStoredInvoice } from "@/lib/data/invoiceStore";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildHtmlFallbackUrl(
  requestUrl: string,
  reason: "disabled" | "unavailable"
): string {
  const printUrl = new URL(requestUrl);
  printUrl.pathname = printUrl.pathname.replace(/\/pdf\/?$/, "/html");
  printUrl.searchParams.set("print", "1");
  printUrl.searchParams.set("pdfFallback", reason);
  return printUrl.toString();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const rateLimited = await enforceRateLimit(
    request,
    "invoice-pdf",
    RATE_LIMITS.sensitiveAccess
  );
  if (rateLimited) return rateLimited;

  try {
    if (!isInvoicePdfEnabled()) {
      return NextResponse.redirect(buildHtmlFallbackUrl(request.url, "disabled"));
    }

    const { orderId } = await context.params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase() ?? undefined;
    const token = searchParams.get("token")?.trim() ?? undefined;

    const resolved = await resolveInvoiceOrder(orderId, email, token);
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.message },
        { status: invoiceOrderErrorStatus(resolved.code) }
      );
    }

    const stored = await getStoredInvoice(orderId);
    const seller = await getInvoiceSellerMetaForOrder(orderId);
    const html = generateInvoiceHtml(resolved.order, seller, {
      showActions: false,
      content: stored?.draft.content,
    });

    const pdfResult = await enqueueInvoicePdf(html);
    if (!pdfResult.ok) {
      console.error(`[invoice-pdf] ${pdfResult.reason}`);
      return NextResponse.redirect(
        buildHtmlFallbackUrl(request.url, "unavailable")
      );
    }

    const filename = buildInvoiceDownloadFilename(resolved.order);
    const pdfBytes = new Uint8Array(pdfResult.buffer);
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Invoice-Pdf-Engine": pdfResult.engine,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to generate PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
