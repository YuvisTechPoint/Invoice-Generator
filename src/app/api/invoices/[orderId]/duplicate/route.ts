import { NextResponse } from "next/server";
import { guardStudioApi } from "@/lib/api/guards";
import { duplicateInvoice } from "@/lib/server/invoiceWorkflow";

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const blocked = await guardStudioApi(request, { rateLimit: "studioApi" });
  if (blocked) return blocked;

  const { orderId } = await context.params;
  const duplicated = await duplicateInvoice(orderId);
  if (!duplicated) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice: duplicated }, { status: 201 });
}
