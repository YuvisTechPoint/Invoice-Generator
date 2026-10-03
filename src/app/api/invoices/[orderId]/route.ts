import { NextResponse } from "next/server";
import { guardStudioApi } from "@/lib/api/guards";
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
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  const { orderId } = await context.params;
  if (orderId === "draft") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const stored = await getStoredInvoice(orderId);
  if (!stored) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json({ invoice: stored });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

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
      const draft = await loadInvoiceDraft(orderId);
      if (!draft) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      await setActiveInvoiceId(orderId);
      return NextResponse.json({
        invoice: await getStoredInvoice(orderId),
        draft,
      });
    }

    if (body.status && !body.draft) {
      const existing = await getStoredInvoice(orderId);
      if (!existing) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      const saved = await saveStoredInvoice(existing.draft, { status: body.status });
      return NextResponse.json({ invoice: saved });
    }

    const parsed = parseInvoiceDraft(body.draft);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const draft = normalizeInvoiceDraft({
      ...parsed.draft,
      orderId,
    });
    const existing = await getStoredInvoice(orderId);
    const saved = await saveStoredInvoice(
      draft,
      body.status ? { status: body.status } : existing ? {} : { status: "draft" }
    );
    await setActiveInvoiceId(saved.id);
    await upsertOrder(draftToOrder(saved.draft), saved.draft);

    return NextResponse.json({ invoice: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to save invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  const { orderId } = await context.params;
  if (!(await getStoredInvoice(orderId))) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  await deleteStoredInvoice(orderId);
  const settings = await getStudioSettings();
  if (settings.activeInvoiceId === orderId) {
    const invoices = await listStoredInvoices();
    await setActiveInvoiceId(invoices[0]?.id ?? null);
  }
  return NextResponse.json({ ok: true });
}
