import { NextResponse } from "next/server";
import {
  deleteStoredInvoice,
  getStoredInvoice,
  listStoredInvoices,
  saveStoredInvoice,
} from "@/lib/data/invoiceStore";
import { setActiveInvoiceId, getStudioSettings } from "@/lib/data/settingsStore";
import { normalizeInvoiceDraft, draftToOrder } from "@/lib/demo/invoiceDraft";
import { parseInvoiceDraft } from "@/lib/validation/invoiceDraftSchema";
import { upsertOrder } from "@/lib/server/orderService";
import { loadInvoiceDraft } from "@/lib/demo/draftStore";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;
  if (orderId === "draft") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stored = getStoredInvoice(orderId);
  if (!stored) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json({ invoice: stored });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    if (orderId === "draft") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      draft?: unknown;
      activate?: boolean;
      status?: "draft" | "issued" | "paid" | "void";
    };

    if (body.activate && !body.draft) {
      const draft = loadInvoiceDraft(orderId);
      if (!draft) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      return NextResponse.json({
        invoice: getStoredInvoice(orderId),
        draft,
      });
    }

    const parsed = parseInvoiceDraft(body.draft);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const draft = normalizeInvoiceDraft({
      ...parsed.draft,
      orderId,
    });
    const saved = saveStoredInvoice(draft, {
      status: body.status,
    });
    setActiveInvoiceId(saved.id);
    upsertOrder(draftToOrder(saved.draft), saved.draft);

    return NextResponse.json({ invoice: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to save invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;
  if (!getStoredInvoice(orderId)) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  deleteStoredInvoice(orderId);
  const settings = getStudioSettings();
  if (settings.activeInvoiceId === orderId) {
    setActiveInvoiceId(listStoredInvoices()[0]?.id ?? null);
  }
  return NextResponse.json({ ok: true });
}
