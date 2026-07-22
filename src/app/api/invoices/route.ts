import { NextResponse } from "next/server";
import {
  deleteStoredInvoice,
  getStoredInvoice,
  listStoredInvoices,
  saveStoredInvoice,
} from "@/lib/data/invoiceStore";
import {
  allocateInvoiceNumber,
  allocateProjectRef,
  getStudioSettings,
  setActiveInvoiceId,
} from "@/lib/data/settingsStore";
import {
  getDefaultInvoiceDraft,
  normalizeInvoiceDraft,
} from "@/lib/demo/invoiceDraft";
import { parseInvoiceDraft } from "@/lib/validation/invoiceDraftSchema";
import { draftToOrder } from "@/lib/demo/invoiceDraft";
import { upsertOrder } from "@/lib/server/orderService";

export async function GET() {
  return NextResponse.json({
    invoices: listStoredInvoices(),
    activeInvoiceId: getStudioSettings().activeInvoiceId,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      draft?: unknown;
      fromActive?: boolean;
    };

    const settings = getStudioSettings();
    let draft = getDefaultInvoiceDraft();
    draft.seller = { ...settings.sellerDefaults };
    draft.orderId = allocateProjectRef();
    draft.invoiceNumber = allocateInvoiceNumber();

    if (body.draft) {
      const parsed = parseInvoiceDraft(body.draft);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      draft = normalizeInvoiceDraft(parsed.draft);
      if (!draft.orderId) draft.orderId = allocateProjectRef();
      if (!draft.invoiceNumber) draft.invoiceNumber = allocateInvoiceNumber();
    }

    const saved = saveStoredInvoice(normalizeInvoiceDraft(draft), {
      status: "draft",
    });
    setActiveInvoiceId(saved.id);
    upsertOrder(draftToOrder(saved.draft), saved.draft);

    return NextResponse.json({ invoice: saved }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to create invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (!getStoredInvoice(id)) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  deleteStoredInvoice(id);
  const settings = getStudioSettings();
  if (settings.activeInvoiceId === id) {
    setActiveInvoiceId(listStoredInvoices()[0]?.id ?? null);
  }
  return NextResponse.json({ ok: true });
}
