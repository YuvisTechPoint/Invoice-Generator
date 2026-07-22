import "server-only";

import { BRAND } from "@/lib/brand";
import { getInvoiceDraft } from "@/lib/demo/draftStore";
import { getStoredInvoice } from "@/lib/data/invoiceStore";
import { draftToSellerMeta } from "@/lib/demo/invoiceDraft";
import type { InvoiceSellerMeta } from "@/features/invoice/types";

const SELLER_META_TTL_MS = 5 * 60 * 1000;
let cachedSellerMeta: { value: InvoiceSellerMeta; expiresAt: number } | null =
  null;

export async function getInvoiceSellerMeta(): Promise<InvoiceSellerMeta> {
  if (cachedSellerMeta && cachedSellerMeta.expiresAt > Date.now()) {
    return cachedSellerMeta.value;
  }

  const draft = getInvoiceDraft();
  const meta = draftToSellerMeta(draft);

  cachedSellerMeta = {
    value: meta,
    expiresAt: Date.now() + SELLER_META_TTL_MS,
  };

  return meta;
}

export async function getInvoiceSellerMetaForOrder(
  orderId: string
): Promise<InvoiceSellerMeta> {
  const stored = getStoredInvoice(orderId);
  if (stored?.draft) {
    return draftToSellerMeta(stored.draft);
  }

  return {
    storeName: BRAND.name,
    legalName: BRAND.name,
    tagline: BRAND.tagline,
    address: BRAND.address,
    email: BRAND.email,
    phone: BRAND.phoneDisplay,
    website: BRAND.domain,
    state: "Maharashtra",
    stateCode: "27",
  };
}

export function clearInvoiceSellerMetaCache(): void {
  cachedSellerMeta = null;
}
