import "server-only";

import type { InvoiceSellerMeta } from "@/features/invoice/types";
import {
  applyContentPlaceholders,
  mergeInvoiceContent,
  type InvoiceSectionContent,
} from "@/features/invoice/invoiceContent";
import { amountInWordsInr } from "@/features/invoice/utils/invoice-utils";
import { BRAND } from "@/lib/brand";
import { buildQrSvgDataUrl, buildUpiPayUrl } from "@/lib/invoice/upiQr";
import { formatOrderIdDisplay } from "@/lib/orderId";
import type { Order, PaymentMethod } from "@/types/order";

const DEFAULT_SELLER = {
  storeName: BRAND.name,
  legalName: BRAND.name,
  tagline: BRAND.tagline,
  address: BRAND.address,
  email: BRAND.email,
  phone: BRAND.phoneDisplay,
  website: BRAND.domain,
};

interface InvoiceLineView {
  index: number;
  title: string;
  subtitle?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface InvoiceViewModel {
  invoiceNumber: string;
  orderId: string;
  orderDate: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  paidOnDate: string;
  paymentLabel: string;
  statusLabel: string;
  paymentNote: string;
  itemCount: number;
  totalInWords: string;
  placeOfSupply: string;
  platformFee: number;
  seller: {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    gstin?: string;
    state: string;
  };
  customer: {
    name: string;
    addressLines: string[];
    email: string;
    phone?: string;
    state: string;
  };
  items: InvoiceLineView[];
  subtotal: number;
  discount?: number;
  discountCode?: string;
  shipping: number;
  total: number;
  isPaid: boolean;
  content: InvoiceSectionContent;
}

function escapeHtml(value: string): string {
  return (value ?? "")
    .toString()
    .replace(/[&<>"']/g, (char) => {
      const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return map[char] ?? char;
    });
}

function formatWebsiteHref(website: string): string {
  const raw = (website ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

function formatTelHref(phone: string): string {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function linkEmail(email: string): string {
  const value = (email ?? "").trim();
  if (!value) return "";
  return `<a class="invoice__link" href="mailto:${escapeHtml(value)}">${escapeHtml(value)}</a>`;
}

function linkPhone(phone: string): string {
  const value = (phone ?? "").trim();
  if (!value) return "";
  const parts = value.split(/[,;/|]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    const href = formatTelHref(value);
    if (!href) return escapeHtml(value);
    return `<a class="invoice__link" href="${escapeHtml(href)}">${escapeHtml(value)}</a>`;
  }
  return parts
    .map((part) => {
      const href = formatTelHref(part);
      if (!href) return escapeHtml(part);
      return `<a class="invoice__link" href="${escapeHtml(href)}">${escapeHtml(part)}</a>`;
    })
    .join(", ");
}

function linkWebsite(website: string): string {
  const display = (website ?? "").trim();
  const href = formatWebsiteHref(display);
  if (!href) return "";
  return `<a class="invoice__link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(display.startsWith("http") ? display : href)}</a>`;
}

function buildProjectContactHtml(
  template: string,
  contacts: { email: string; phone: string; website: string }
): string {
  const emailLink = linkEmail(contacts.email);
  const phoneLink = linkPhone(contacts.phone);
  const websiteLink = linkWebsite(contacts.website);

  const trimmed = template.trim();
  if (!trimmed) {
    return [emailLink, phoneLink, websiteLink].filter(Boolean).join(" · ");
  }

  if (
    trimmed.includes("{email}") ||
    trimmed.includes("{phone}") ||
    trimmed.includes("{website}")
  ) {
    return applyContentPlaceholders(trimmed, {
      email: emailLink || escapeHtml(contacts.email),
      phone: phoneLink || escapeHtml(contacts.phone),
      website: websiteLink || escapeHtml(contacts.website),
    });
  }

  // Plain custom text — still append clickable contacts when available
  const links = [emailLink, phoneLink, websiteLink].filter(Boolean).join(" · ");
  return `${escapeHtml(trimmed)}${links ? ` · ${links}` : ""}`;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function paymentLabel(method: PaymentMethod, override?: string): string {
  if (override?.trim()) return override.trim();
  if (method === "cod") return "Due on milestone";
  if (method === "upi") return "UPI";
  if (method === "net_banking") return "Net Banking";
  if (method === "razorpay") return "Online Payment (UPI / Card / Net Banking)";
  if ((method as string) === "demo") return "Demo payment";
  return method;
}

function statusLabel(
  order: Order,
  content: InvoiceSectionContent
): string {
  if (content.statusOverride.trim()) return content.statusOverride.trim();
  if (order.paymentStatus === "paid") return content.statusPaid;
  if (order.paymentStatus === "cod_pending") return content.statusCod;
  return order.paymentStatus;
}

function paymentNoteFor(
  order: Order,
  content: InvoiceSectionContent
): string {
  if (order.paymentStatus === "cod_pending") return content.paymentNoteCod;
  if (order.paymentStatus === "paid") return content.paymentNotePaid;
  return content.paymentNoteOther;
}

function buildViewModel(
  order: Order,
  sellerMeta?: InvoiceSellerMeta,
  contentInput?: Partial<InvoiceSectionContent>
): InvoiceViewModel {
  const invoice = order.invoice;
  if (!invoice) {
    throw new Error("Order invoice data missing");
  }

  const content = mergeInvoiceContent(contentInput);

  const seller = sellerMeta ?? {
    storeName: DEFAULT_SELLER.storeName,
    legalName: DEFAULT_SELLER.legalName,
    tagline: DEFAULT_SELLER.tagline,
    address: DEFAULT_SELLER.address,
    email: DEFAULT_SELLER.email,
    phone: DEFAULT_SELLER.phone,
    website: DEFAULT_SELLER.website,
    state: "Maharashtra",
    stateCode: "27",
  };

  const paymentNote = paymentNoteFor(order, content);

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const address = order.shippingAddress;
  const addressLines = [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country ?? "India",
  ].filter(Boolean) as string[];

  const lineItems: InvoiceLineView[] =
    invoice.lineBreakdown.length > 0
      ? invoice.lineBreakdown.map((line, index) => ({
          index: index + 1,
          title: line.name,
          subtitle: order.items[index]?.variantLabel,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        }))
      : order.items.map((item, index) => ({
          index: index + 1,
          title: item.name,
          subtitle: item.variantLabel,
          quantity: item.quantity,
          unitPrice: item.price,
          lineTotal: item.price * item.quantity,
        }));

  const placeOfSupply =
    content.placeOfSupplyOverride.trim() ||
    invoice.buyerState ||
    address.state;

  const totalInWords =
    content.amountInWordsOverride.trim() ||
    amountInWordsInr(invoice.grandTotal);

  return {
    invoiceNumber: invoice.invoiceNumber,
    orderId: formatOrderIdDisplay(order.id),
    orderDate: formatDate(order.createdAt),
    invoiceDate: formatDate(invoice.invoiceDate ?? order.createdAt),
    dueDate: formatDate(order.dueDate),
    paymentTerms: (order.paymentTerms ?? "").trim(),
    paidOnDate: formatDate(order.paymentCompletedAt),
    paymentLabel: paymentLabel(order.paymentMethod, content.paymentModeOverride),
    statusLabel: statusLabel(order, content),
    paymentNote,
    itemCount,
    totalInWords,
    placeOfSupply,
    platformFee: invoice.platformFee,
    seller: {
      name: seller.legalName || seller.storeName,
      address: seller.address,
      email: seller.email,
      phone: seller.phone,
      website: seller.website ?? DEFAULT_SELLER.website,
      gstin: seller.gstin,
      state: seller.state,
    },
    customer: {
      name: address.name,
      addressLines,
      email: order.email,
      phone: order.customerPhone ?? address.phone,
      state: address.state,
    },
    items: lineItems,
    subtotal: invoice.subtotal,
    discount: invoice.couponDiscount > 0 ? invoice.couponDiscount : undefined,
    discountCode: order.couponCode ?? undefined,
    shipping: invoice.shippingCharge,
    total: invoice.grandTotal,
    isPaid: content.settlementStatus === "paid",
    content,
  };
}

const INVOICE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, "Segoe UI", sans-serif;
    font-size: 11px;
    line-height: 1.45;
    color: #111111;
    background: #e8e8e8;
  }
  /* margin: 0 removes the browser's URL/date header and footer from the printout */
  @page { size: A4; margin: 0; }
  @media print {
    .no-print { display: none !important; }
    html, body { background: #fff; }
    body { padding: 8mm 9mm; font-size: 10px; line-height: 1.35; }
    .invoice__sheet { box-shadow: none; margin: 0; max-width: none; }
  }
  .invoice__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    max-width: 210mm;
    margin: 0 auto;
    padding: 10px 0;
  }
  .invoice__toolbar-nav,
  .invoice__toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .invoice__toolbar button,
  .invoice__toolbar a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 18px;
    border: 1px solid #111;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    border-radius: 0;
  }
  .invoice__toolbar-actions button {
    background: #111;
    color: #fff;
  }
  .invoice__toolbar-nav button,
  .invoice__toolbar a {
    background: #fff;
    color: #111;
  }
  .invoice__toolbar-cancel { display: none; }
  .invoice__pdf-fallback {
    max-width: 210mm;
    margin: 0 auto 12px;
    padding: 10px 14px;
    border: 1px solid #c9a227;
    background: #fff8e6;
    color: #5c4813;
    font-size: 12px;
    line-height: 1.4;
  }
  @media (max-width: 640px) {
    .invoice__toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: #e8e8e8;
      padding: 10px 12px;
      border-bottom: 1px solid #cfcfcf;
    }
    .invoice__toolbar-back { display: none; }
    .invoice__toolbar-cancel { display: inline-flex; }
    .invoice__toolbar-actions { margin-left: auto; }
  }
  .invoice__sheet {
    max-width: 210mm;
    margin: 0 auto 24px;
    background: #fff;
    border: 1px solid #111;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
  .invoice__header {
    display: block;
    width: 100%;
    border-bottom: 1px solid #111;
  }
  .invoice__title-block {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 12px 16px;
    width: 100%;
    text-align: right;
    background: #f5f5f5;
    padding: 12px 20px;
  }
  .invoice__doc-label {
    margin: 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #555;
    white-space: nowrap;
  }
  .invoice__doc-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #111;
    white-space: nowrap;
    line-height: 1;
  }
  .invoice__copy-badge {
    display: inline-block;
    padding: 4px 10px;
    border: 1px solid #111;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: #fff;
    white-space: nowrap;
  }
  .invoice__meta-table,
  .invoice__party-table,
  .invoice__items,
  .invoice__totals {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .invoice__meta-table td,
  .invoice__party-table th,
  .invoice__party-table td,
  .invoice__items th,
  .invoice__items td,
  .invoice__totals td {
    border: 1px solid #111;
    padding: 7px 10px;
    vertical-align: top;
    word-break: break-word;
  }
  .invoice__meta-table .label {
    width: 16%;
    background: #f3f3f3;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #333;
  }
  .invoice__meta-table .value {
    width: 34%;
    font-size: 11px;
    font-weight: 600;
    color: #111;
  }
  .invoice__parties {
    display: table;
    width: 100%;
    border-bottom: 1px solid #111;
  }
  .invoice__party-cell {
    display: table-cell;
    width: 50%;
    vertical-align: top;
  }
  .invoice__party-cell:first-child { border-right: 1px solid #111; }
  .invoice__party-table { border: 0; }
  .invoice__party-table th {
    background: #111;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-align: left;
    padding: 8px 10px;
    border: 0;
    border-bottom: 1px solid #111;
  }
  .invoice__party-table td {
    border: 0;
    border-bottom: 1px solid #d4d4d4;
    font-size: 10px;
    line-height: 1.55;
    color: #222;
  }
  .invoice__party-table tr:last-child td { border-bottom: 0; }
  .invoice__party-name {
    font-size: 11px;
    font-weight: 700;
    color: #111;
  }
  .invoice__items th {
    background: #111;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: left;
  }
  .invoice__items th.num,
  .invoice__items td.num { text-align: right; }
  .invoice__items th.center,
  .invoice__items td.center { text-align: center; }
  .invoice__items tbody tr:nth-child(even) td { background: #fafafa; }
  .invoice__item-title { font-weight: 700; color: #111; }
  .invoice__item-sub { margin-top: 2px; font-size: 9px; color: #555; }
  .invoice__summary {
    display: table;
    width: 100%;
    border-top: 1px solid #111;
  }
  .invoice__summary-words,
  .invoice__summary-totals {
    display: table-cell;
    vertical-align: top;
  }
  .invoice__summary-words {
    width: 58%;
    border-right: 1px solid #111;
    padding: 12px 14px;
    background: #f9f9f9;
  }
  .invoice__summary-totals { width: 42%; }
  .invoice__summary-heading {
    margin: 0 0 6px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #444;
  }
  .invoice__summary-text {
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    color: #111;
    line-height: 1.5;
  }
  .invoice__totals td {
    border-left: 0;
    border-right: 0;
    padding: 7px 12px;
    font-size: 11px;
  }
  .invoice__totals tr:first-child td { border-top: 0; }
  .invoice__totals td:first-child { color: #333; }
  .invoice__totals td:last-child {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .invoice__totals tr.grand td {
    background: #111;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    border-color: #111;
  }
  .invoice__payment {
    border-top: 1px solid #111;
    padding: 12px 14px;
    background: #fff;
  }
  .invoice__payment-title {
    margin: 0 0 4px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #111;
  }
  .invoice__payment-text {
    margin: 0;
    font-size: 10px;
    color: #333;
    line-height: 1.55;
  }
  .invoice__status {
    display: inline-block;
    margin-top: 6px;
    padding: 3px 8px;
    border: 1px solid #111;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .invoice__status--paid { background: #111; color: #fff; }
  .invoice__status--cod { background: #fff; color: #111; }
  .invoice__settle {
    border-top: 1px solid #111;
  }
  .invoice__settle-bar {
    display: table;
    width: 100%;
    border-bottom: 1px solid #111;
    background: #fafafa;
    table-layout: fixed;
  }
  .invoice__settle-meta,
  .invoice__settle-status {
    display: table-cell;
    vertical-align: middle;
    padding: 12px 14px;
  }
  .invoice__settle-meta {
    width: 48%;
    font-size: 10px;
    color: #333;
    line-height: 1.55;
  }
  .invoice__settle-meta strong {
    color: #111;
    font-weight: 700;
  }
  .invoice__settle-meta p { margin: 0 0 2px; }
  .invoice__settle-meta p:last-child { margin: 0; }
  .invoice__settle-status {
    width: 52%;
    text-align: right;
  }
  .invoice__settle-amounts {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px 18px;
    align-items: center;
  }
  .invoice__settle-amt {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  .invoice__settle-amt.is-paid { color: #1b7f3a; }
  .invoice__settle-amt.is-due { color: #9b1c1c; }
  .invoice__settle-amt strong {
    font-variant-numeric: tabular-nums;
  }
  .invoice__paid-dot,
  .invoice__due-dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    color: #fff;
    font-size: 10px;
    line-height: 1;
  }
  .invoice__paid-dot { background: #22a34a; }
  .invoice__due-dot { background: #c81e1e; }
  .invoice__pay-grid {
    display: table;
    width: 100%;
    table-layout: fixed;
  }
  .invoice__pay-bank,
  .invoice__pay-upi,
  .invoice__pay-sign {
    display: table-cell;
    vertical-align: top;
    padding: 14px 16px;
  }
  .invoice__pay-grid--1 .invoice__pay-bank,
  .invoice__pay-grid--1 .invoice__pay-upi,
  .invoice__pay-grid--1 .invoice__pay-sign { width: 100%; }
  .invoice__pay-grid--2 .invoice__pay-bank,
  .invoice__pay-grid--2 .invoice__pay-upi,
  .invoice__pay-grid--2 .invoice__pay-sign { width: 50%; }
  .invoice__pay-grid--3 .invoice__pay-bank { width: 40%; }
  .invoice__pay-grid--3 .invoice__pay-upi { width: 28%; }
  .invoice__pay-grid--3 .invoice__pay-sign { width: 32%; }
  .invoice__pay-upi,
  .invoice__pay-sign {
    border-left: 1px solid #d4d4d4;
  }
  .invoice__pay-upi { text-align: center; }
  .invoice__pay-sign { text-align: center; }
  .invoice__pay-heading {
    margin: 0 0 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #111;
    text-align: left;
  }
  .invoice__pay-upi .invoice__pay-heading { text-align: center; }
  .invoice__bank-table {
    width: 100%;
    border-collapse: collapse;
  }
  .invoice__bank-table td {
    padding: 2px 0;
    font-size: 10px;
    vertical-align: top;
    color: #222;
  }
  .invoice__bank-table td:first-child {
    width: 36%;
    font-weight: 700;
    color: #111;
    padding-right: 8px;
  }
  .invoice__bank-table td:last-child {
    font-weight: 600;
  }
  .invoice__bank-table td.mono {
    font-family: Consolas, "Courier New", monospace;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .invoice__remit {
    margin: 10px 0 0;
    padding-top: 8px;
    border-top: 1px dashed #ccc;
    font-size: 9px;
    color: #444;
    line-height: 1.45;
    text-align: left;
  }
  .invoice__upi-qr {
    display: inline-block;
    width: 118px;
    height: 118px;
    border: 1px solid #111;
    background: #fff;
  }
  .invoice__upi-id {
    margin: 6px 0 0;
    font-size: 9px;
    color: #333;
    word-break: break-all;
  }
  .invoice__sign-for {
    margin: 0 0 10px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #333;
  }
  .invoice__sign-mark {
    min-height: 48px;
    margin: 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #bbb;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #888;
  }
  .invoice__sign-image {
    display: block;
    max-width: 180px;
    max-height: 64px;
    width: auto;
    height: auto;
    margin: 8px auto;
    object-fit: contain;
  }
  .invoice__sign-name {
    margin: 4px 0 0;
    font-size: 11px;
    font-weight: 700;
    color: #111;
  }
  .invoice__sign-title {
    margin: 0;
    font-size: 10px;
    font-weight: 600;
    color: #444;
  }
  .invoice__notes {
    border-top: 1px solid #111;
    padding: 12px 14px;
    background: #fafafa;
    font-size: 9px;
    color: #444;
    line-height: 1.65;
  }
  .invoice__notes-title {
    margin: 0 0 8px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #111;
  }
  .invoice__notes-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .invoice__notes-list li {
    margin: 0 0 6px;
    padding: 0;
  }
  .invoice__notes-list li:last-child { margin: 0; }
  .invoice__notes strong { color: #111; }
  .invoice__link {
    color: #1253ED;
    text-decoration: underline;
    font-weight: 600;
  }
  .invoice__link:hover { color: #0f3f99; }
  .invoice__footer {
    border-top: 1px solid #111;
    background: #111;
    color: #f2f2f2;
  }
  .invoice__footer-inner {
    padding: 12px 16px 14px;
  }
  .invoice__footer-disclaimer {
    margin: 0 0 8px;
    font-size: 9px;
    line-height: 1.55;
    color: #e8e8e8;
    text-align: left;
  }
  .invoice__footer-meta {
    display: table;
    width: 100%;
    border-top: 1px solid #333;
    padding-top: 8px;
    font-size: 8px;
    line-height: 1.5;
    color: #bdbdbd;
  }
  .invoice__footer-jurisdiction,
  .invoice__footer-copy {
    display: table-cell;
    vertical-align: middle;
  }
  .invoice__footer-jurisdiction { text-align: left; width: 55%; }
  .invoice__footer-copy { text-align: right; width: 45%; }
  .invoice__footer .invoice__link {
    color: #9ec1ff;
    font-weight: 600;
  }
  .invoice__footer .invoice__link:hover { color: #c5daff; }
  .invoice__visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 720px) {
    .invoice__header,
    .invoice__parties,
    .invoice__summary,
    .invoice__settle-bar,
    .invoice__pay-grid,
    .invoice__footer-meta {
      display: block;
    }
    .invoice__title-block {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      width: 100%;
    }
    .invoice__party-cell,
    .invoice__summary-words,
    .invoice__summary-totals,
    .invoice__settle-meta,
    .invoice__settle-status,
    .invoice__pay-bank,
    .invoice__pay-upi,
    .invoice__pay-sign,
    .invoice__footer-jurisdiction,
    .invoice__footer-copy {
      display: block;
      width: 100%;
      border-right: 0;
      border-left: 0;
    }
    .invoice__party-cell:first-child { border-bottom: 1px solid #111; }
    .invoice__summary-words { border-bottom: 1px solid #111; }
    .invoice__pay-bank,
    .invoice__pay-upi { border-bottom: 1px solid #d4d4d4; }
    .invoice__pay-upi,
    .invoice__pay-sign { border-left: 0; }
    .invoice__settle-status { text-align: left; }
    .invoice__footer-jurisdiction,
    .invoice__footer-copy { text-align: left; }
    .invoice__footer-copy { margin-top: 4px; }
    .invoice__meta-table .label,
    .invoice__meta-table .value { display: block; width: 100%; }
  }
  @media print {
    .invoice__items tbody tr:nth-child(even) td { background: #fff; }
    .invoice__totals tr.grand td { background: #111; color: #fff; }
    /* Compact spacing so the invoice fits on a single A4 sheet */
    .invoice__doc-title { margin: 0; font-size: 16px; }
    .invoice__meta-table td,
    .invoice__party-table th,
    .invoice__party-table td,
    .invoice__items th,
    .invoice__items td,
    .invoice__totals td { padding: 4px 8px; }
    .invoice__party-table th { padding: 5px 8px; }
    .invoice__totals td { padding: 4px 10px; font-size: 10px; }
    .invoice__totals tr.grand td { font-size: 11px; }
    .invoice__summary-words { padding: 8px 10px; }
    .invoice__payment { padding: 8px 10px; }
    .invoice__payment-text { font-size: 9px; line-height: 1.4; }
    .invoice__status { margin-top: 4px; }
    .invoice__settle-meta,
    .invoice__settle-status,
    .invoice__pay-bank,
    .invoice__pay-upi,
    .invoice__pay-sign { padding: 8px 10px; }
    .invoice__upi-qr { width: 96px; height: 96px; }
    .invoice__sign-mark { min-height: 36px; font-size: 9px; }
    .invoice__notes { padding: 8px 10px; font-size: 8px; line-height: 1.5; }
    .invoice__notes-list li { margin: 0 0 4px; }
    .invoice__footer-inner { padding: 8px 10px 10px; }
    .invoice__footer-disclaimer { font-size: 8px; margin-bottom: 6px; }
    .invoice__footer-meta { font-size: 7px; padding-top: 6px; }
    .invoice__header,
    .invoice__parties,
    .invoice__meta-table,
    .invoice__summary,
    .invoice__payment,
    .invoice__settle,
    .invoice__notes,
    .invoice__footer { break-inside: avoid; page-break-inside: avoid; }
    .invoice__items tr { break-inside: avoid; page-break-inside: avoid; }
  }
`;

function renderInvoiceBody(data: InvoiceViewModel): string {
  const c = data.content;
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td class="center">${item.index}</td>
          <td>
            <div class="invoice__item-title">${escapeHtml(item.title)}</div>
            ${item.subtitle ? `<div class="invoice__item-sub">${escapeHtml(item.subtitle)}</div>` : ""}
          </td>
          <td class="center">${item.quantity}</td>
          <td class="num">${formatInr(item.unitPrice)}</td>
          <td class="num">${formatInr(item.lineTotal)}</td>
        </tr>`
    )
    .join("");

  const discountRow = data.discount
    ? `<tr><td>${escapeHtml(data.discountCode?.trim() || c.labelDiscount)}</td><td>− ${formatInr(data.discount)}</td></tr>`
    : "";

  const platformFeeRow =
    data.platformFee > 0
      ? `<tr><td>${escapeHtml(c.labelPlatformFee)}</td><td>${formatInr(data.platformFee)}</td></tr>`
      : "";

  const customerAddress = data.customer.addressLines
    .map((line) => escapeHtml(line))
    .join("<br/>");

  const statusClass =
    data.statusLabel.toLowerCase().includes("paid")
      ? "invoice__status--paid"
      : "invoice__status--cod";

  const supportContactHtml = buildProjectContactHtml(c.supportText, {
    email: data.seller.email,
    phone: "+916291129896",
    website: data.seller.website,
  });

  const copyrightHtml = applyContentPlaceholders(c.footerCopyright, {
    year: String(new Date().getFullYear()),
    name: escapeHtml(data.seller.name),
    website: linkWebsite(data.seller.website) || escapeHtml(data.seller.website),
  });

  const paidRaw = Number.isFinite(c.amountPaidValue) ? c.amountPaidValue : NaN;
  const dueRaw = Number.isFinite(c.amountDueValue) ? c.amountDueValue : NaN;
  const bothZero =
    (paidRaw === 0 || !Number.isFinite(paidRaw)) &&
    (dueRaw === 0 || !Number.isFinite(dueRaw));
  const paidAmount = bothZero
    ? data.isPaid || c.settlementStatus === "paid"
      ? data.total
      : 0
    : Number.isFinite(paidRaw) && paidRaw >= 0
      ? paidRaw
      : data.isPaid
        ? data.total
        : 0;
  const dueAmount = bothZero
    ? data.isPaid || c.settlementStatus === "paid"
      ? 0
      : data.total
    : Number.isFinite(dueRaw) && dueRaw >= 0
      ? dueRaw
      : data.isPaid
        ? 0
        : data.total;

  const showPaidChip = paidAmount > 0 || dueAmount <= 0;
  const showDueChip = dueAmount > 0;

  const settleStatus = `<div class="invoice__settle-amounts">
      ${
        showPaidChip
          ? `<span class="invoice__settle-amt is-paid">
        <span class="invoice__paid-dot" aria-hidden="true">✓</span>
        ${escapeHtml(c.amountPaidLabel)}
        <strong>${formatInr(paidAmount)}</strong>
      </span>`
          : ""
      }
      ${
        showDueChip
          ? `<span class="invoice__settle-amt is-due">
        <span class="invoice__due-dot" aria-hidden="true">!</span>
        ${escapeHtml(c.amountDueLabel)}
        <strong>${formatInr(dueAmount)}</strong>
      </span>`
          : ""
      }
    </div>`;

  const settleMetaLines: string[] = [];
  if (data.paymentTerms) {
    settleMetaLines.push(
      `<p><strong>${escapeHtml(c.labelPaymentTerms)}:</strong> ${escapeHtml(data.paymentTerms)}</p>`
    );
  }
  if (dueAmount > 0 && data.dueDate && data.dueDate !== "—") {
    settleMetaLines.push(
      `<p><strong>${escapeHtml(c.labelDueDate)}:</strong> ${escapeHtml(data.dueDate)}</p>`
    );
  }
  if (paidAmount > 0 && dueAmount <= 0 && data.paidOnDate && data.paidOnDate !== "—") {
    settleMetaLines.push(
      `<p><strong>${escapeHtml(c.labelPaidOn)}:</strong> ${escapeHtml(data.paidOnDate)}</p>`
    );
  }
  if (settleMetaLines.length === 0) {
    settleMetaLines.push(
      `<p><strong>${escapeHtml(c.amountInWordsPrefix)}</strong> ${escapeHtml(data.totalInWords)}</p>`
    );
  }

  const upiUrl = buildUpiPayUrl({
    upiId: c.upiId,
    payeeName: c.upiPayeeName || c.bankAccountHolder,
    amount: dueAmount > 0 ? dueAmount : undefined,
    invoiceNumber: data.invoiceNumber,
  });
  const upiQr = upiUrl ? buildQrSvgDataUrl(upiUrl) : null;

  const safeSignatureSrc =
    c.signatoryImageDataUrl.startsWith("data:image/")
      ? c.signatoryImageDataUrl
      : "";

  const signatureMarkup = safeSignatureSrc
    ? `<img class="invoice__sign-image" src="${safeSignatureSrc}" alt="Authorized signature" />`
    : `<div class="invoice__sign-mark">Signature space</div>`;

  const remittanceHtml = c.remittanceNote.trim()
    ? `<p class="invoice__remit">${escapeHtml(
        applyContentPlaceholders(c.remittanceNote, {
          invoice: data.invoiceNumber,
          name: data.seller.name,
        })
      )}</p>`
    : "";

  const bankBlock = c.showBankDetails
    ? `<div class="invoice__pay-bank">
        <p class="invoice__pay-heading">${escapeHtml(c.bankDetailsHeading)}</p>
        <table class="invoice__bank-table">
          <tbody>
            <tr><td>Bank</td><td>${escapeHtml(c.bankName)}</td></tr>
            <tr><td>Account holder</td><td>${escapeHtml(c.bankAccountHolder)}</td></tr>
            <tr><td>Account no.</td><td class="mono">${escapeHtml(c.bankAccountNumber)}</td></tr>
            <tr><td>IFSC</td><td class="mono">${escapeHtml(c.bankIfsc)}</td></tr>
            ${c.bankAccountType.trim() ? `<tr><td>Account type</td><td>${escapeHtml(c.bankAccountType)}</td></tr>` : ""}
            <tr><td>Branch</td><td>${escapeHtml(c.bankBranch)}</td></tr>
          </tbody>
        </table>
        ${remittanceHtml}
      </div>`
    : "";

  const upiBlock = c.showUpiQr
    ? `<div class="invoice__pay-upi">
        <p class="invoice__pay-heading">${escapeHtml(c.upiHeading)}</p>
        ${
          upiQr
            ? `<img class="invoice__upi-qr" src="${upiQr}" alt="UPI QR code for ${escapeHtml(c.upiId || "payment")}" />`
            : `<p class="invoice__upi-id">Add a UPI ID to generate QR</p>`
        }
        ${c.upiId.trim() ? `<p class="invoice__upi-id">${escapeHtml(c.upiId)}</p>` : ""}
        ${c.upiPayeeName.trim() ? `<p class="invoice__upi-id">${escapeHtml(c.upiPayeeName)}</p>` : ""}
      </div>`
    : "";

  const signBlock = c.showSignatory
    ? `<div class="invoice__pay-sign">
        <p class="invoice__sign-for">${escapeHtml(c.signatoryForLabel)}</p>
        ${signatureMarkup}
        ${c.signatoryName.trim() ? `<p class="invoice__sign-name">${escapeHtml(c.signatoryName)}</p>` : ""}
        <p class="invoice__sign-title">${escapeHtml(c.signatoryTitle)}</p>
      </div>`
    : "";

  const payColumns = [bankBlock, upiBlock, signBlock].filter(Boolean);
  const payGridClass = `invoice__pay-grid invoice__pay-grid--${Math.max(1, payColumns.length)}`;

  const settlementBar = c.showSettlementBar
    ? `<div class="invoice__settle-bar">
          <div class="invoice__settle-meta">${settleMetaLines.join("")}</div>
          <div class="invoice__settle-status">${settleStatus}</div>
        </div>`
    : "";

  const paymentNoteSection = c.showPayment
    ? `<section class="invoice__payment">
        <p class="invoice__payment-title">${escapeHtml(c.paymentTitle)}</p>
        <p class="invoice__payment-text">${escapeHtml(data.paymentNote)}</p>
        <span class="invoice__status ${statusClass}">${escapeHtml(data.statusLabel)}</span>
      </section>`
    : "";

  const showPayGrid = payColumns.length > 0;

  const bankDetailsSection =
    c.showSettlementBar || showPayGrid
      ? `<section class="invoice__settle" aria-label="Payment and bank details">
        ${settlementBar}
        ${
          showPayGrid
            ? `<div class="${payGridClass}">
          ${payColumns.join("")}
        </div>`
            : ""
        }
      </section>`
      : "";

  const notesSection = c.showNotes
    ? `<section class="invoice__notes">
        <p class="invoice__notes-title">Terms</p>
        <ul class="invoice__notes-list">
          <li><strong>${escapeHtml(c.deliveryLabel)}:</strong> ${escapeHtml(c.deliveryText)}</li>
          <li><strong>${escapeHtml(c.returnsLabel)}:</strong> ${escapeHtml(c.returnsText)}</li>
          <li><strong>${escapeHtml(c.supportLabel)}:</strong> ${supportContactHtml}</li>
        </ul>
      </section>`
    : "";

  const footerDisclaimer = safeSignatureSrc
    ? c.footerDisclaimerSigned || c.footerDisclaimer
    : c.footerDisclaimer;

  const footerSection = c.showFooter
    ? `<footer class="invoice__footer">
        <div class="invoice__footer-inner">
          <p class="invoice__footer-disclaimer">${escapeHtml(footerDisclaimer)}</p>
          <div class="invoice__footer-meta">
            <div class="invoice__footer-jurisdiction">${escapeHtml(c.footerJurisdiction)}</div>
            <div class="invoice__footer-copy">${copyrightHtml}</div>
          </div>
        </div>
      </footer>`
    : "";

  const dueDateRow =
    data.dueDate && data.dueDate !== "—"
      ? `<tr>
            <td class="label">${escapeHtml(c.labelDueDate)}</td>
            <td class="value">${escapeHtml(data.dueDate)}</td>
            <td class="label">${escapeHtml(c.labelPaymentTerms)}</td>
            <td class="value">${escapeHtml(data.paymentTerms || "—")}</td>
          </tr>`
      : data.paymentTerms
        ? `<tr>
            <td class="label">${escapeHtml(c.labelPaymentTerms)}</td>
            <td class="value" colspan="3">${escapeHtml(data.paymentTerms)}</td>
          </tr>`
        : "";

  const soldByContact = [
    data.seller.email?.trim() ? linkEmail(data.seller.email) : "",
    data.seller.phone?.trim() ? linkPhone(data.seller.phone) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const customerContact = [
    data.customer.email ? linkEmail(data.customer.email) : "",
    data.customer.phone?.trim() ? linkPhone(data.customer.phone) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // Service Provider = developer/studio; Bill To = client.
  const serviceProviderBlock = `
              <tr>
                <td colspan="2">
                  <span class="invoice__party-name">${escapeHtml(data.seller.name)}</span><br/>
                  ${data.seller.gstin ? `<strong>GSTIN:</strong> ${escapeHtml(data.seller.gstin)}<br/>` : ""}
                  ${escapeHtml(data.seller.address).replace(/\n/g, "<br/>")}
                  ${soldByContact ? `<br/>${soldByContact}` : ""}
                </td>
              </tr>`;

  const billToBlock = `
              <tr>
                <td colspan="2">
                  <span class="invoice__party-name">${escapeHtml(data.customer.name)}</span><br/>
                  ${customerAddress}<br/>
                  <strong>State:</strong> ${escapeHtml(data.customer.state)}
                  ${customerContact ? `<br/>${customerContact}` : ""}
                </td>
              </tr>`;

  return `
    <div class="invoice__sheet">
      <header class="invoice__header">
        <div class="invoice__title-block">
          <p class="invoice__doc-label">${escapeHtml(c.documentLabel)}</p>
          <h1 class="invoice__doc-title">${escapeHtml(c.documentTitle)}</h1>
          <span class="invoice__copy-badge">${escapeHtml(c.copyBadge)}</span>
        </div>
      </header>

      <table class="invoice__meta-table" aria-label="Invoice metadata">
        <tbody>
          <tr>
            <td class="label">${escapeHtml(c.labelInvoiceNo)}</td>
            <td class="value">${escapeHtml(data.invoiceNumber)}</td>
            <td class="label">${escapeHtml(c.labelOrderNo)}</td>
            <td class="value">${escapeHtml(data.orderId)}</td>
          </tr>
          <tr>
            <td class="label">${escapeHtml(c.labelInvoiceDate)}</td>
            <td class="value">${escapeHtml(data.invoiceDate)}</td>
            <td class="label">${escapeHtml(c.labelOrderDate)}</td>
            <td class="value">${escapeHtml(data.orderDate)}</td>
          </tr>
          <tr>
            <td class="label">${escapeHtml(c.labelPaymentMode)}</td>
            <td class="value">${escapeHtml(data.paymentLabel)}</td>
            <td class="label">${escapeHtml(c.labelPlaceOfSupply)}</td>
            <td class="value">${escapeHtml(data.placeOfSupply)}</td>
          </tr>
          ${dueDateRow}
        </tbody>
      </table>

      <div class="invoice__parties">
        <div class="invoice__party-cell">
          <table class="invoice__party-table">
            <thead><tr><th colspan="2">${escapeHtml(c.soldByHeading)}</th></tr></thead>
            <tbody>
              ${serviceProviderBlock}
            </tbody>
          </table>
        </div>
        <div class="invoice__party-cell">
          <table class="invoice__party-table">
            <thead><tr><th colspan="2">${escapeHtml(c.billToHeading)}</th></tr></thead>
            <tbody>
              ${billToBlock}
            </tbody>
          </table>
        </div>
      </div>

      <table class="invoice__items">
        <caption class="invoice__visually-hidden">Services (${data.itemCount})</caption>
        <thead>
          <tr>
            <th class="center" style="width:6%">${escapeHtml(c.colSl)}</th>
            <th style="width:48%">${escapeHtml(c.colDescription)}</th>
            <th class="center" style="width:10%">${escapeHtml(c.colQty)}</th>
            <th class="num" style="width:18%">${escapeHtml(c.colUnitPrice)}</th>
            <th class="num" style="width:18%">${escapeHtml(c.colTotal)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="invoice__summary">
        <div class="invoice__summary-words">
          <p class="invoice__summary-heading">${escapeHtml(c.amountInWordsHeading)}</p>
          <p class="invoice__summary-text">${escapeHtml(data.totalInWords)}</p>
        </div>
        <div class="invoice__summary-totals">
          <table class="invoice__totals" aria-label="Invoice totals">
            <tbody>
              <tr><td>${escapeHtml(c.labelSubtotal)}</td><td>${formatInr(data.subtotal)}</td></tr>
              ${discountRow}
              ${data.shipping > 0 ? `<tr><td>${escapeHtml(c.labelShipping)}</td><td>${formatInr(data.shipping)}</td></tr>` : ""}
              ${platformFeeRow}
              <tr class="grand"><td>${escapeHtml(c.labelGrandTotal)}</td><td>${formatInr(data.total)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      ${paymentNoteSection}
      ${bankDetailsSection}

      ${notesSection}

      ${footerSection}
    </div>
  `;
}

function sanitizeReturnTo(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return undefined;
  return trimmed;
}

export function generateInvoiceHtml(
  order: Order,
  seller?: InvoiceSellerMeta,
  options?: {
    autoPrint?: boolean;
    showActions?: boolean;
    downloadUrl?: string;
    returnTo?: string;
    pdfFallbackNotice?: string;
    content?: Partial<InvoiceSectionContent>;
  }
): string {
  const data = buildViewModel(order, seller, options?.content);
  const body = renderInvoiceBody(data);
  const showActions = options?.showActions !== false;
  const returnTo = sanitizeReturnTo(options?.returnTo);

  const downloadUrl = options?.downloadUrl?.trim() || "/api/invoices/draft/pdf";
  const downloadFilename = `Invoice-${data.invoiceNumber.replace(/[^\w.-]+/g, "-") || "draft"}.pdf`;

  const fallbackBanner = options?.pdfFallbackNotice
    ? `<div class="invoice__pdf-fallback no-print" role="status">${escapeHtml(options.pdfFallbackNotice)}</div>`
    : "";

  const navScript = `<script>
function invoiceGoBack(){
  var returnTo=${JSON.stringify(returnTo ?? "")};
  if(returnTo){window.location.href=returnTo;return;}
  if(window.history.length>1){window.history.back();return;}
  window.location.href="/invoices";
}
function invoiceDownload(){
  var pdfUrl=${JSON.stringify(downloadUrl || "/api/invoices/draft/pdf")};
  var filename=${JSON.stringify(downloadFilename)};
  var btn=document.querySelector(".invoice__toolbar-actions button:last-child");
  if(btn){ btn.disabled=true; btn.textContent="Downloading…"; }
  fetch(pdfUrl, { method: "GET", cache: "no-store" })
    .then(function(res){
      if(!res.ok){ throw new Error("PDF download failed"); }
      return res.arrayBuffer().then(function(buf){
        return { buf: buf, type: res.headers.get("content-type") || "" };
      });
    })
    .then(function(result){
      var bytes=new Uint8Array(result.buf);
      var isPdf=bytes.length>4 && bytes[0]===0x25 && bytes[1]===0x50 && bytes[2]===0x44 && bytes[3]===0x46;
      if(!isPdf){ throw new Error("Invalid PDF response"); }
      var blob=new Blob([result.buf], { type: "application/pdf" });
      var url=URL.createObjectURL(blob);
      var a=document.createElement("a");
      a.href=url;
      a.download=filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    })
    .catch(function(err){
      console.error(err);
      window.location.href=pdfUrl;
    })
    .finally(function(){
      if(btn){ btn.disabled=false; btn.textContent="Download PDF"; }
    });
}
</script>`;

  const actions = showActions
    ? `<header class="invoice__toolbar no-print">
        <div class="invoice__toolbar-nav">
          <button type="button" class="invoice__toolbar-back" onclick="invoiceGoBack()">← Back</button>
          <button type="button" class="invoice__toolbar-cancel" onclick="invoiceGoBack()">Cancel</button>
        </div>
        <div class="invoice__toolbar-actions">
          <button type="button" onclick="window.print()">Print Invoice</button>
          <button type="button" onclick="invoiceDownload()">Download PDF</button>
        </div>
      </header>${fallbackBanner}${navScript}`
    : fallbackBanner;

  const printScript = options?.autoPrint
    ? `<script>window.addEventListener("load",function(){window.print();});</script>`
    : "";

  const visuallyHiddenCss = `.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(data.content.documentTitle)} ${escapeHtml(data.invoiceNumber)} — ${escapeHtml(data.seller.name)}</title>
  <style>${INVOICE_CSS}${visuallyHiddenCss}</style>
</head>
<body>
  ${actions}
  ${body}
  ${printScript}
</body>
</html>`;
}
