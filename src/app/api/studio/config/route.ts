import { NextResponse } from "next/server";
import {
  canIssueClientShareLinks,
  isStudioAuthDisabled,
  isStudioAuthRequired,
} from "@/lib/config/env";
import { isInvoicePdfEnabled } from "@/features/invoice/server/resolveInvoiceOrder";

export async function GET() {
  return NextResponse.json({
    authRequired: isStudioAuthRequired(),
    authDisabled: isStudioAuthDisabled(),
    shareLinksEnabled: canIssueClientShareLinks(),
    pdfEnabled: isInvoicePdfEnabled(),
  });
}
