import { NextResponse } from "next/server";
import { guardStudioApi } from "@/lib/api/guards";
import {
  deleteStoredInvoice,
  getStoredInvoice,
  listStoredInvoices,
  saveStoredInvoice,
} from "@/lib/data/invoiceStore";
import { getStudioSettings, setActiveInvoiceId } from "@/lib/data/settingsStore";
import { parseInvoiceDraft } from "@/lib/validation/invoiceDraftSchema";
import {
  draftToOrder,
  normalizeInvoiceDraft,
} from "@/lib/demo/invoiceDraft";
import { upsertOrder } from "@/lib/server/orderService";
import { createNewInvoice } from "@/lib/server/invoiceWorkflow";

export async function GET(request: Request) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  const [invoices, settings] = await Promise.all([
    listStoredInvoices(),
    getStudioSettings(),
  ]);

  return NextResponse.json({
    invoices,
    activeInvoiceId: settings.activeInvoiceId,
  });
}

export async function POST(request: Request) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      draft?: unknown;
    };

    if (body.draft) {
      const parsed = parseInvoiceDraft(body.draft);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      let draft = normalizeInvoiceDraft(parsed.draft);
      if (!draft.orderId || !draft.invoiceNumber) {
        const created = await createNewInvoice();
        draft = normalizeInvoiceDraft({
          ...draft,
          orderId: draft.orderId || created.id,
          invoiceNumber: draft.invoiceNumber || created.invoiceNumber,
        });
      }
      const saved = await saveStoredInvoice(draft, { status: "draft" });
      await setActiveInvoiceId(saved.id);
      await upsertOrder(draftToOrder(saved.draft), saved.draft);
      return NextResponse.json({ invoice: saved }, { status: 201 });
    }

    const saved = await createNewInvoice();
    return NextResponse.json({ invoice: saved }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to create invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (!(await getStoredInvoice(id))) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  await deleteStoredInvoice(id);
  const settings = await getStudioSettings();
  if (settings.activeInvoiceId === id) {
    const invoices = await listStoredInvoices();
    await setActiveInvoiceId(invoices[0]?.id ?? null);
  }
  return NextResponse.json({ ok: true });
}
