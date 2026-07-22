export type InvoiceSectionContent = {
  /** Header — left brand block */
  brandTagline: string;
  showLogo: boolean;
  /** Uploaded company logo as data URL (image/png, jpeg, webp, svg+xml) */
  logoImageDataUrl: string;

  /** Header — right title block */
  documentLabel: string;
  documentTitle: string;
  copyBadge: string;

  /** Metadata grid labels */
  labelInvoiceNo: string;
  labelInvoiceDate: string;
  labelPaymentMode: string;
  labelOrderNo: string;
  labelOrderDate: string;
  labelPlaceOfSupply: string;
  labelDueDate: string;
  labelPaymentTerms: string;
  labelPaidOn: string;
  /** Optional overrides (blank = auto from order) */
  paymentModeOverride: string;
  placeOfSupplyOverride: string;

  /** Party headings */
  soldByHeading: string;
  billToHeading: string;

  /** Line-item table headers */
  colSl: string;
  colDescription: string;
  colQty: string;
  colUnitPrice: string;
  colTotal: string;

  /** Totals / amount in words */
  amountInWordsHeading: string;
  amountInWordsOverride: string;
  labelSubtotal: string;
  labelDiscount: string;
  labelShipping: string;
  labelShippingFree: string;
  labelPlatformFee: string;
  labelGrandTotal: string;

  /** Payment block */
  showPayment: boolean;
  paymentTitle: string;
  paymentNotePaid: string;
  paymentNoteCod: string;
  paymentNoteOther: string;
  statusPaid: string;
  statusCod: string;
  statusOverride: string;

  /** Settlement strip + bank / UPI / signatory */
  showSettlementBar: boolean;
  /** Explicit badge emphasis: paid vs due */
  settlementStatus: "paid" | "due";
  showBankDetails: boolean;
  amountInWordsPrefix: string;
  amountPaidLabel: string;
  amountDueLabel: string;
  /** Editable rupee amounts shown after Grand Total */
  amountPaidValue: number;
  amountDueValue: number;
  bankDetailsHeading: string;
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  bankAccountType: string;
  remittanceNote: string;
  showUpiQr: boolean;
  upiHeading: string;
  upiId: string;
  upiPayeeName: string;
  showSignatory: boolean;
  signatoryForLabel: string;
  signatoryName: string;
  signatoryTitle: string;
  /** Uploaded signature as data URL (image/png or image/jpeg) */
  signatoryImageDataUrl: string;

  /** Terms / notes */
  showNotes: boolean;
  deliveryLabel: string;
  deliveryText: string;
  returnsLabel: string;
  returnsText: string;
  supportLabel: string;
  /** Placeholders: {email} {phone} {website} — leave blank to auto-compose */
  supportText: string;

  /** Footer */
  showFooter: boolean;
  footerDisclaimer: string;
  /** Used when a signature image is present */
  footerDisclaimerSigned: string;
  footerJurisdiction: string;
  /** Placeholders: {year} {name} {website} */
  footerCopyright: string;
};

/** Defaults tuned for website & software development client invoices. */
export const DEFAULT_INVOICE_CONTENT: InvoiceSectionContent = {
  brandTagline:
    "Website design, custom software, and digital product engineering for growing businesses.",
  showLogo: true,
  logoImageDataUrl: "",

  documentLabel: "Document",
  documentTitle: "Invoice",
  copyBadge: "Original for Recipient",

  labelInvoiceNo: "Invoice No.",
  labelInvoiceDate: "Invoice Date",
  labelPaymentMode: "Payment Mode",
  labelOrderNo: "Project Ref.",
  labelOrderDate: "Project Date",
  labelPlaceOfSupply: "Place of Supply",
  labelDueDate: "Due Date",
  labelPaymentTerms: "Payment Terms",
  labelPaidOn: "Paid On",
  paymentModeOverride: "",
  placeOfSupplyOverride: "",

  soldByHeading: "Service Provider",
  billToHeading: "Bill To",

  colSl: "Sl.",
  colDescription: "Description of Services",
  colQty: "Qty",
  colUnitPrice: "Rate",
  colTotal: "Total",

  amountInWordsHeading: "Amount Chargeable (in words)",
  amountInWordsOverride: "",
  labelSubtotal: "Subtotal",
  labelDiscount: "Discount",
  labelShipping: "Delivery / setup",
  labelShippingFree: "INCLUDED",
  labelPlatformFee: "Other charges",
  labelGrandTotal: "Grand Total",

  showPayment: true,
  paymentTitle: "Payment Information",
  paymentNotePaid:
    "Payment has been received. This invoice is issued for website / software development services rendered.",
  paymentNoteCod:
    "Balance payable on milestone completion or delivery as agreed in the proposal.",
  paymentNoteOther:
    "Invoice issued. Payment is due as per the agreed payment terms.",
  statusPaid: "Paid",
  statusCod: "Due on milestone",
  statusOverride: "",

  showSettlementBar: true,
  settlementStatus: "paid",
  showBankDetails: true,
  amountInWordsPrefix: "Total amount (in words):",
  amountPaidLabel: "Amount Paid",
  amountDueLabel: "Amount Due",
  amountPaidValue: 0,
  amountDueValue: 0,
  bankDetailsHeading: "Bank Details",
  bankName: "UCO Bank",
  bankAccountHolder: "Yuvraj Prasad",
  bankAccountNumber: "03300110078846",
  bankIfsc: "UCBA0000330",
  bankBranch: "Madhyamgram, Kolkata",
  bankAccountType: "Current",
  remittanceNote:
    "Please quote invoice number {invoice} with all remittances.",
  showUpiQr: true,
  upiHeading: "Pay using UPI",
  upiId: "yuvrajprasad@uco",
  upiPayeeName: "Yuvraj Prasad",
  showSignatory: true,
  signatoryForLabel: "For M/S NORTHLINE DIGITAL",
  signatoryName: "Yuvraj Prasad",
  signatoryTitle: "Authorized Signatory",
  signatoryImageDataUrl: "",

  showNotes: true,
  deliveryLabel: "Delivery",
  deliveryText:
    "Work products (design files, source code, staging/production access) will be delivered digitally to the client contact on this invoice. Acceptance is as per the signed proposal or SOW.",
  returnsLabel: "Revisions & warranty",
  returnsText:
    "Includes the revision rounds stated in the proposal. Post-delivery defect fixes for delivered scope are covered for 15 days unless a maintenance plan applies. Scope changes are billed separately.",
  supportLabel: "Project contact",
  supportText: "{email} · {phone} · {website}",

  showFooter: false,
  footerDisclaimer:
    "This is a computer-generated invoice for professional services. A physical signature is not required when no signature image is affixed.",
  footerDisclaimerSigned:
    "This invoice is issued for professional services. The authorized signature above confirms the details stated herein.",
  footerJurisdiction: "Subject to Mumbai jurisdiction, India. E. & O.E.",
  footerCopyright: "© {year} {name} · {website}",
};

export function mergeInvoiceContent(
  partial?: Partial<InvoiceSectionContent> | null
): InvoiceSectionContent {
  const incoming = partial ?? {};
  const result = { ...DEFAULT_INVOICE_CONTENT };
  for (const key of Object.keys(DEFAULT_INVOICE_CONTENT) as Array<
    keyof InvoiceSectionContent
  >) {
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      const value = incoming[key];
      if (value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }
  return result;
}

export function applyContentPlaceholders(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key] ?? "";
    }
    return match;
  });
}
