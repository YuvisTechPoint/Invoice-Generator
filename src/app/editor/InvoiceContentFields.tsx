"use client";

import type { ReactNode } from "react";
import type { InvoiceSectionContent } from "@/features/invoice/invoiceContent";

function Field({
  id,
  label,
  hint,
  children,
  fullWidth,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`editor-field-wrap${fullWidth ? " editor-field-wrap--full" : ""}`}>
      <label className="editor-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? (
        <span className="editor-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="editor-field-wrap">
      <label className="editor-label" htmlFor={id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    </div>
  );
}

type Props = {
  formId: string;
  content: InvoiceSectionContent;
  onChange: (patch: Partial<InvoiceSectionContent>) => void;
  onResetDefaults: () => void;
};

export default function InvoiceContentFields({
  formId,
  content,
  onChange,
  onResetDefaults,
}: Props) {
  const fid = (name: string) => `${formId}-content-${name}`;

  return (
    <>
      <fieldset className="editor-section">
        <legend>Section visibility</legend>
        <div className="editor-grid">
          <Toggle
            id={fid("showPayment")}
            label="Show payment note"
            checked={content.showPayment}
            onChange={(showPayment) => onChange({ showPayment })}
          />
          <Toggle
            id={fid("showBank")}
            label="Show bank / UPI / signatory"
            checked={content.showBankDetails}
            onChange={(showBankDetails) => onChange({ showBankDetails })}
          />
          <Toggle
            id={fid("showSettle")}
            label="Show amount paid/due bar"
            checked={content.showSettlementBar}
            onChange={(showSettlementBar) => onChange({ showSettlementBar })}
          />
          <Toggle
            id={fid("showUpi")}
            label="Show UPI QR"
            checked={content.showUpiQr}
            onChange={(showUpiQr) => onChange({ showUpiQr })}
          />
          <Toggle
            id={fid("showSign")}
            label="Show authorized signatory"
            checked={content.showSignatory}
            onChange={(showSignatory) => onChange({ showSignatory })}
          />
          <Toggle
            id={fid("showNotes")}
            label="Show terms / notes"
            checked={content.showNotes}
            onChange={(showNotes) => onChange({ showNotes })}
          />
          <Toggle
            id={fid("showFooter")}
            label="Show footer"
            checked={content.showFooter}
            onChange={(showFooter) => onChange({ showFooter })}
          />
          <div className="editor-field-wrap">
            <button type="button" className="editor-btn" onClick={onResetDefaults}>
              Reset section text defaults
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>1. Header — studio brand & document title</legend>
        <div className="editor-grid">
          <Field id={fid("tagline")} label="Brand tagline" fullWidth>
            <textarea
              id={fid("tagline")}
              className="editor-textarea"
              value={content.brandTagline}
              onChange={(e) => onChange({ brandTagline: e.target.value })}
              rows={2}
            />
          </Field>
          <Field id={fid("docLabel")} label="Document label (e.g. Document)">
            <input
              id={fid("docLabel")}
              className="editor-field"
              value={content.documentLabel}
              onChange={(e) => onChange({ documentLabel: e.target.value })}
            />
          </Field>
          <Field id={fid("docTitle")} label="Document title (e.g. Invoice)">
            <input
              id={fid("docTitle")}
              className="editor-field"
              value={content.documentTitle}
              onChange={(e) => onChange({ documentTitle: e.target.value })}
            />
          </Field>
          <Field id={fid("copyBadge")} label="Copy badge" fullWidth>
            <input
              id={fid("copyBadge")}
              className="editor-field"
              value={content.copyBadge}
              onChange={(e) => onChange({ copyBadge: e.target.value })}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>2. Metadata grid labels & overrides</legend>
        <div className="editor-grid">
          <Field id={fid("lInvNo")} label="Invoice No. label">
            <input
              id={fid("lInvNo")}
              className="editor-field"
              value={content.labelInvoiceNo}
              onChange={(e) => onChange({ labelInvoiceNo: e.target.value })}
            />
          </Field>
          <Field id={fid("lOrdNo")} label="Order No. label">
            <input
              id={fid("lOrdNo")}
              className="editor-field"
              value={content.labelOrderNo}
              onChange={(e) => onChange({ labelOrderNo: e.target.value })}
            />
          </Field>
          <Field id={fid("lInvDate")} label="Invoice Date label">
            <input
              id={fid("lInvDate")}
              className="editor-field"
              value={content.labelInvoiceDate}
              onChange={(e) => onChange({ labelInvoiceDate: e.target.value })}
            />
          </Field>
          <Field id={fid("lOrdDate")} label="Order Date label">
            <input
              id={fid("lOrdDate")}
              className="editor-field"
              value={content.labelOrderDate}
              onChange={(e) => onChange({ labelOrderDate: e.target.value })}
            />
          </Field>
          <Field id={fid("lPay")} label="Payment Mode label">
            <input
              id={fid("lPay")}
              className="editor-field"
              value={content.labelPaymentMode}
              onChange={(e) => onChange({ labelPaymentMode: e.target.value })}
            />
          </Field>
          <Field id={fid("lPos")} label="Place of Supply label">
            <input
              id={fid("lPos")}
              className="editor-field"
              value={content.labelPlaceOfSupply}
              onChange={(e) => onChange({ labelPlaceOfSupply: e.target.value })}
            />
          </Field>
          <Field id={fid("lDue")} label="Due Date label">
            <input
              id={fid("lDue")}
              className="editor-field"
              value={content.labelDueDate}
              onChange={(e) => onChange({ labelDueDate: e.target.value })}
            />
          </Field>
          <Field id={fid("lTerms")} label="Payment Terms label">
            <input
              id={fid("lTerms")}
              className="editor-field"
              value={content.labelPaymentTerms}
              onChange={(e) => onChange({ labelPaymentTerms: e.target.value })}
            />
          </Field>
          <Field id={fid("lPaidOn")} label="Paid On label">
            <input
              id={fid("lPaidOn")}
              className="editor-field"
              value={content.labelPaidOn}
              onChange={(e) => onChange({ labelPaidOn: e.target.value })}
            />
          </Field>
          <Field
            id={fid("payOverride")}
            label="Payment mode text override"
            hint="Leave blank to auto-generate from payment method"
          >
            <input
              id={fid("payOverride")}
              className="editor-field"
              value={content.paymentModeOverride}
              onChange={(e) => onChange({ paymentModeOverride: e.target.value })}
              aria-describedby={`${fid("payOverride")}-hint`}
            />
          </Field>
          <Field
            id={fid("posOverride")}
            label="Place of supply override"
            hint="Leave blank to use buyer state"
          >
            <input
              id={fid("posOverride")}
              className="editor-field"
              value={content.placeOfSupplyOverride}
              onChange={(e) => onChange({ placeOfSupplyOverride: e.target.value })}
              aria-describedby={`${fid("posOverride")}-hint`}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>3. Sold By / Bill To headings</legend>
        <div className="editor-grid">
          <Field id={fid("soldBy")} label="Sold By heading">
            <input
              id={fid("soldBy")}
              className="editor-field"
              value={content.soldByHeading}
              onChange={(e) => onChange({ soldByHeading: e.target.value })}
            />
          </Field>
          <Field id={fid("billTo")} label="Bill To heading">
            <input
              id={fid("billTo")}
              className="editor-field"
              value={content.billToHeading}
              onChange={(e) => onChange({ billToHeading: e.target.value })}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>4. Line-item table column headers</legend>
        <div className="editor-grid">
          <Field id={fid("colSl")} label="Sl.">
            <input id={fid("colSl")} className="editor-field" value={content.colSl} onChange={(e) => onChange({ colSl: e.target.value })} />
          </Field>
          <Field id={fid("colDesc")} label="Description">
            <input id={fid("colDesc")} className="editor-field" value={content.colDescription} onChange={(e) => onChange({ colDescription: e.target.value })} />
          </Field>
          <Field id={fid("colQty")} label="Qty">
            <input id={fid("colQty")} className="editor-field" value={content.colQty} onChange={(e) => onChange({ colQty: e.target.value })} />
          </Field>
          <Field id={fid("colUnit")} label="Unit Price">
            <input id={fid("colUnit")} className="editor-field" value={content.colUnitPrice} onChange={(e) => onChange({ colUnitPrice: e.target.value })} />
          </Field>
          <Field id={fid("colTotal")} label="Total">
            <input id={fid("colTotal")} className="editor-field" value={content.colTotal} onChange={(e) => onChange({ colTotal: e.target.value })} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>5. Amount in words & totals labels</legend>
        <div className="editor-grid">
          <Field id={fid("wordsHead")} label="Amount in words heading" fullWidth>
            <input
              id={fid("wordsHead")}
              className="editor-field"
              value={content.amountInWordsHeading}
              onChange={(e) => onChange({ amountInWordsHeading: e.target.value })}
            />
          </Field>
          <Field
            id={fid("wordsOverride")}
            label="Amount in words override"
            hint="Leave blank to auto-generate from grand total"
            fullWidth
          >
            <textarea
              id={fid("wordsOverride")}
              className="editor-textarea"
              value={content.amountInWordsOverride}
              onChange={(e) => onChange({ amountInWordsOverride: e.target.value })}
              rows={2}
              aria-describedby={`${fid("wordsOverride")}-hint`}
            />
          </Field>
          <Field id={fid("lSub")} label="Subtotal label">
            <input id={fid("lSub")} className="editor-field" value={content.labelSubtotal} onChange={(e) => onChange({ labelSubtotal: e.target.value })} />
          </Field>
          <Field id={fid("lDisc")} label="Discount label">
            <input id={fid("lDisc")} className="editor-field" value={content.labelDiscount} onChange={(e) => onChange({ labelDiscount: e.target.value })} />
          </Field>
          <Field id={fid("lShip")} label="Shipping label">
            <input id={fid("lShip")} className="editor-field" value={content.labelShipping} onChange={(e) => onChange({ labelShipping: e.target.value })} />
          </Field>
          <Field id={fid("lFree")} label="Free shipping text">
            <input id={fid("lFree")} className="editor-field" value={content.labelShippingFree} onChange={(e) => onChange({ labelShippingFree: e.target.value })} />
          </Field>
          <Field id={fid("lPlat")} label="Platform fee label">
            <input id={fid("lPlat")} className="editor-field" value={content.labelPlatformFee} onChange={(e) => onChange({ labelPlatformFee: e.target.value })} />
          </Field>
          <Field id={fid("lGrand")} label="Grand Total label" fullWidth>
            <input id={fid("lGrand")} className="editor-field" value={content.labelGrandTotal} onChange={(e) => onChange({ labelGrandTotal: e.target.value })} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>6. Payment information</legend>
        <div className="editor-grid">
          <Field id={fid("payTitle")} label="Section title" fullWidth>
            <input
              id={fid("payTitle")}
              className="editor-field"
              value={content.paymentTitle}
              onChange={(e) => onChange({ paymentTitle: e.target.value })}
            />
          </Field>
          <Field id={fid("notePaid")} label="Note when Paid" fullWidth>
            <textarea
              id={fid("notePaid")}
              className="editor-textarea"
              value={content.paymentNotePaid}
              onChange={(e) => onChange({ paymentNotePaid: e.target.value })}
              rows={2}
            />
          </Field>
          <Field id={fid("noteCod")} label="Note when due on milestone" fullWidth>
            <textarea
              id={fid("noteCod")}
              className="editor-textarea"
              value={content.paymentNoteCod}
              onChange={(e) => onChange({ paymentNoteCod: e.target.value })}
              rows={2}
            />
          </Field>
          <Field id={fid("noteOther")} label="Note otherwise" fullWidth>
            <textarea
              id={fid("noteOther")}
              className="editor-textarea"
              value={content.paymentNoteOther}
              onChange={(e) => onChange({ paymentNoteOther: e.target.value })}
              rows={2}
            />
          </Field>
          <Field id={fid("statusPaid")} label="Status badge — Paid">
            <input
              id={fid("statusPaid")}
              className="editor-field"
              value={content.statusPaid}
              onChange={(e) => onChange({ statusPaid: e.target.value })}
            />
          </Field>
          <Field id={fid("statusCod")} label="Status badge — Due on milestone">
            <input
              id={fid("statusCod")}
              className="editor-field"
              value={content.statusCod}
              onChange={(e) => onChange({ statusCod: e.target.value })}
            />
          </Field>
          <Field
            id={fid("statusOverride")}
            label="Status badge override"
            hint="Leave blank to use Paid / Due on milestone labels above"
            fullWidth
          >
            <input
              id={fid("statusOverride")}
              className="editor-field"
              value={content.statusOverride}
              onChange={(e) => onChange({ statusOverride: e.target.value })}
              aria-describedby={`${fid("statusOverride")}-hint`}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>7. Bank details / UPI / signatory</legend>
        <p className="editor-hint">
          Inspired by professional due invoices — shows account transfer details, UPI QR, and
          authorized signatory.
        </p>
        <div className="editor-grid">
          <Field id={fid("wordsPrefix")} label="Amount-in-words prefix" fullWidth>
            <input
              id={fid("wordsPrefix")}
              className="editor-field"
              value={content.amountInWordsPrefix}
              onChange={(e) => onChange({ amountInWordsPrefix: e.target.value })}
            />
          </Field>
          <Field id={fid("paidLabel")} label="Paid badge label">
            <input
              id={fid("paidLabel")}
              className="editor-field"
              value={content.amountPaidLabel}
              onChange={(e) => onChange({ amountPaidLabel: e.target.value })}
            />
          </Field>
          <Field id={fid("dueLabel")} label="Due badge label">
            <input
              id={fid("dueLabel")}
              className="editor-field"
              value={content.amountDueLabel}
              onChange={(e) => onChange({ amountDueLabel: e.target.value })}
            />
          </Field>
          <Field id={fid("bankHead")} label="Bank section heading" fullWidth>
            <input
              id={fid("bankHead")}
              className="editor-field"
              value={content.bankDetailsHeading}
              onChange={(e) => onChange({ bankDetailsHeading: e.target.value })}
            />
          </Field>
          <Field id={fid("bankName")} label="Bank">
            <input
              id={fid("bankName")}
              className="editor-field"
              value={content.bankName}
              onChange={(e) => onChange({ bankName: e.target.value })}
            />
          </Field>
          <Field id={fid("bankHolder")} label="Account holder">
            <input
              id={fid("bankHolder")}
              className="editor-field"
              value={content.bankAccountHolder}
              onChange={(e) => onChange({ bankAccountHolder: e.target.value })}
            />
          </Field>
          <Field id={fid("bankAcct")} label="Account number">
            <input
              id={fid("bankAcct")}
              className="editor-field"
              value={content.bankAccountNumber}
              onChange={(e) => onChange({ bankAccountNumber: e.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field id={fid("bankIfsc")} label="IFSC code">
            <input
              id={fid("bankIfsc")}
              className="editor-field"
              value={content.bankIfsc}
              onChange={(e) => onChange({ bankIfsc: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field id={fid("bankBranch")} label="Branch" fullWidth>
            <input
              id={fid("bankBranch")}
              className="editor-field"
              value={content.bankBranch}
              onChange={(e) => onChange({ bankBranch: e.target.value })}
            />
          </Field>
          <Field id={fid("upiHead")} label="UPI heading">
            <input
              id={fid("upiHead")}
              className="editor-field"
              value={content.upiHeading}
              onChange={(e) => onChange({ upiHeading: e.target.value })}
            />
          </Field>
          <Field id={fid("upiId")} label="UPI ID">
            <input
              id={fid("upiId")}
              className="editor-field"
              value={content.upiId}
              onChange={(e) => onChange({ upiId: e.target.value })}
              placeholder="name@bank"
            />
          </Field>
          <Field id={fid("upiPayee")} label="UPI payee name" fullWidth>
            <input
              id={fid("upiPayee")}
              className="editor-field"
              value={content.upiPayeeName}
              onChange={(e) => onChange({ upiPayeeName: e.target.value })}
            />
          </Field>
          <Field id={fid("signFor")} label="Signatory ‘For’ line" fullWidth>
            <input
              id={fid("signFor")}
              className="editor-field"
              value={content.signatoryForLabel}
              onChange={(e) => onChange({ signatoryForLabel: e.target.value })}
            />
          </Field>
          <Field id={fid("signName")} label="Signatory name">
            <input
              id={fid("signName")}
              className="editor-field"
              value={content.signatoryName}
              onChange={(e) => onChange({ signatoryName: e.target.value })}
            />
          </Field>
          <Field id={fid("signTitle")} label="Signatory title">
            <input
              id={fid("signTitle")}
              className="editor-field"
              value={content.signatoryTitle}
              onChange={(e) => onChange({ signatoryTitle: e.target.value })}
            />
          </Field>
          <Field
            id={fid("signUpload")}
            label="Signature image"
            hint="Prefer uploading from the Authorized signature panel above for live preview"
            fullWidth
          >
            <input
              id={fid("signUpload")}
              className="editor-field"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !file.type.startsWith("image/")) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") {
                    onChange({
                      signatoryImageDataUrl: reader.result,
                      showSignatory: true,
                    });
                  }
                };
                reader.readAsDataURL(file);
              }}
              aria-describedby={`${fid("signUpload")}-hint`}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>8. Terms — Delivery / Returns / Support</legend>
        <div className="editor-grid editor-grid--1">
          <Field id={fid("delLabel")} label="Delivery label">
            <input
              id={fid("delLabel")}
              className="editor-field"
              value={content.deliveryLabel}
              onChange={(e) => onChange({ deliveryLabel: e.target.value })}
            />
          </Field>
          <Field id={fid("delText")} label="Delivery text">
            <textarea
              id={fid("delText")}
              className="editor-textarea"
              value={content.deliveryText}
              onChange={(e) => onChange({ deliveryText: e.target.value })}
              rows={3}
            />
          </Field>
          <Field id={fid("retLabel")} label="Returns & Warranty label">
            <input
              id={fid("retLabel")}
              className="editor-field"
              value={content.returnsLabel}
              onChange={(e) => onChange({ returnsLabel: e.target.value })}
            />
          </Field>
          <Field id={fid("retText")} label="Returns & Warranty text">
            <textarea
              id={fid("retText")}
              className="editor-textarea"
              value={content.returnsText}
              onChange={(e) => onChange({ returnsText: e.target.value })}
              rows={3}
            />
          </Field>
          <Field id={fid("supLabel")} label="Customer Support label">
            <input
              id={fid("supLabel")}
              className="editor-field"
              value={content.supportLabel}
              onChange={(e) => onChange({ supportLabel: e.target.value })}
            />
          </Field>
          <Field
            id={fid("supText")}
            label="Customer Support text"
            hint="Placeholders: {email} {phone} {website}. Blank = auto from seller."
          >
            <textarea
              id={fid("supText")}
              className="editor-textarea"
              value={content.supportText}
              onChange={(e) => onChange({ supportText: e.target.value })}
              rows={2}
              aria-describedby={`${fid("supText")}-hint`}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="editor-section">
        <legend>9. Legal footer</legend>
        <div className="editor-grid editor-grid--1">
          <Field
            id={fid("footDisc")}
            label="Disclaimer (unsigned)"
            hint="Used when no signature image is uploaded"
          >
            <textarea
              id={fid("footDisc")}
              className="editor-textarea"
              value={content.footerDisclaimer}
              onChange={(e) => onChange({ footerDisclaimer: e.target.value })}
              rows={2}
              aria-describedby={`${fid("footDisc")}-hint`}
            />
          </Field>
          <Field
            id={fid("footDiscSigned")}
            label="Disclaimer (signed)"
            hint="Used when a signature image is present"
          >
            <textarea
              id={fid("footDiscSigned")}
              className="editor-textarea"
              value={content.footerDisclaimerSigned}
              onChange={(e) => onChange({ footerDisclaimerSigned: e.target.value })}
              rows={2}
              aria-describedby={`${fid("footDiscSigned")}-hint`}
            />
          </Field>
          <Field id={fid("footJuris")} label="Jurisdiction">
            <input
              id={fid("footJuris")}
              className="editor-field"
              value={content.footerJurisdiction}
              onChange={(e) => onChange({ footerJurisdiction: e.target.value })}
            />
          </Field>
          <Field
            id={fid("footCopy")}
            label="Copyright line"
            hint="Placeholders: {year} {name} {website}"
          >
            <input
              id={fid("footCopy")}
              className="editor-field"
              value={content.footerCopyright}
              onChange={(e) => onChange({ footerCopyright: e.target.value })}
              aria-describedby={`${fid("footCopy")}-hint`}
            />
          </Field>
        </div>
      </fieldset>
    </>
  );
}
