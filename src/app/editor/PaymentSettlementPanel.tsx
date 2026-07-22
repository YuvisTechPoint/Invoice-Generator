"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import type { InvoiceSectionContent } from "@/features/invoice/invoiceContent";
import { buildQrSvgDataUrl, buildUpiPayUrl } from "@/lib/invoice/upiQr";
import { SectionFrame } from "./SectionFrame";

type Props = {
  content: InvoiceSectionContent;
  grandTotal: number;
  onChange: (patch: Partial<InvoiceSectionContent>) => void;
  onSettlementChange: (status: "paid" | "due") => void;
};

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

const MAX_SIGNATURE_BYTES = 1_500_000;

export default function PaymentSettlementPanel({
  content,
  grandTotal,
  onChange,
  onSettlementChange,
}: Props) {
  const fid = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const dueAmount = Number.isFinite(content.amountDueValue)
    ? content.amountDueValue
    : 0;

  const upiUrl = buildUpiPayUrl({
    upiId: content.upiId,
    payeeName: content.upiPayeeName || content.bankAccountHolder,
    amount: dueAmount > 0 ? dueAmount : undefined,
  });
  const liveQr = upiUrl ? buildQrSvgDataUrl(upiUrl, 140) : null;

  function readSignature(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Upload a PNG or JPG signature image.");
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      setUploadError("Signature image must be under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:image/")) {
        setUploadError("Could not read that image.");
        return;
      }
      onChange({
        signatoryImageDataUrl: result,
        showSignatory: true,
        showBankDetails: true,
      });
    };
    reader.onerror = () => setUploadError("Failed to read signature file.");
    reader.readAsDataURL(file);
  }

  return (
    <>
      <SectionFrame
        title="Amount Paid / Amount Due"
        onDelete={() => onChange({ showSettlementBar: false })}
        onRestore={() => onChange({ showSettlementBar: true })}
        removed={!content.showSettlementBar}
      >
        <p className="editor-hint">
          Set Amount Paid (e.g. advance ₹6,000) and Amount Due (e.g. bill ₹30,000) separately.
          They are independent — changing one will not overwrite the other.
        </p>
        <div className="editor-settle-toggle" role="group" aria-label="Settlement shortcuts">
          <button
            type="button"
            className={`editor-settle-btn${content.settlementStatus === "paid" ? " is-active is-paid" : ""}`}
            onClick={() => onSettlementChange("paid")}
            aria-pressed={content.settlementStatus === "paid"}
          >
            Mark fully paid
          </button>
          <button
            type="button"
            className={`editor-settle-btn${content.settlementStatus === "due" ? " is-active is-due" : ""}`}
            onClick={() => onSettlementChange("due")}
            aria-pressed={content.settlementStatus === "due"}
          >
            Mark fully due
          </button>
        </div>
        <div className="editor-grid" style={{ marginTop: "0.75rem" }}>
          <Field id={`${fid}-paid-label`} label="Paid label">
            <input
              id={`${fid}-paid-label`}
              className="editor-field"
              value={content.amountPaidLabel}
              onChange={(e) => onChange({ amountPaidLabel: e.target.value })}
            />
          </Field>
          <Field id={`${fid}-due-label`} label="Due label">
            <input
              id={`${fid}-due-label`}
              className="editor-field"
              value={content.amountDueLabel}
              onChange={(e) => onChange({ amountDueLabel: e.target.value })}
            />
          </Field>
          <Field
            id={`${fid}-paid-amt`}
            label="Amount Paid (₹)"
            hint="e.g. advance already received"
          >
            <input
              id={`${fid}-paid-amt`}
              className="editor-field"
              type="number"
              min={0}
              step="0.01"
              value={Number.isFinite(content.amountPaidValue) ? content.amountPaidValue : 0}
              onChange={(e) => {
                const paid = Math.max(0, Number(e.target.value) || 0);
                onChange({
                  amountPaidValue: paid,
                  settlementStatus: content.amountDueValue > 0 || paid < grandTotal ? "due" : "paid",
                  showSettlementBar: true,
                });
              }}
              aria-describedby={`${fid}-paid-amt-hint`}
            />
          </Field>
          <Field
            id={`${fid}-due-amt`}
            label="Amount Due (₹)"
            hint="e.g. full bill or remaining balance — edit freely"
          >
            <input
              id={`${fid}-due-amt`}
              className="editor-field"
              type="number"
              min={0}
              step="0.01"
              value={Number.isFinite(content.amountDueValue) ? content.amountDueValue : 0}
              onChange={(e) => {
                const due = Math.max(0, Number(e.target.value) || 0);
                onChange({
                  amountDueValue: due,
                  settlementStatus: due > 0 ? "due" : "paid",
                  showSettlementBar: true,
                });
              }}
              aria-describedby={`${fid}-due-amt-hint`}
            />
          </Field>
        </div>
        <p className="editor-hint" style={{ marginTop: "0.5rem" }}>
          Invoice grand total:{" "}
          {grandTotal.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
          {" · "}
          You can set Paid ₹6,000 and Due ₹30,000 at the same time.
        </p>
      </SectionFrame>

      <SectionFrame
        title="Bank details"
        onDelete={() => onChange({ showBankDetails: false })}
        onRestore={() => onChange({ showBankDetails: true })}
        removed={!content.showBankDetails}
      >
        <div className="editor-grid">
          <Field id={`${fid}-bank`} label="Bank">
            <input
              id={`${fid}-bank`}
              className="editor-field"
              value={content.bankName}
              onChange={(e) => onChange({ bankName: e.target.value })}
            />
          </Field>
          <Field id={`${fid}-holder`} label="Account holder">
            <input
              id={`${fid}-holder`}
              className="editor-field"
              value={content.bankAccountHolder}
              onChange={(e) =>
                onChange({
                  bankAccountHolder: e.target.value,
                  upiPayeeName: content.upiPayeeName || e.target.value,
                })
              }
            />
          </Field>
          <Field id={`${fid}-acct`} label="Account number">
            <input
              id={`${fid}-acct`}
              className="editor-field"
              value={content.bankAccountNumber}
              onChange={(e) => onChange({ bankAccountNumber: e.target.value })}
              inputMode="numeric"
            />
          </Field>
          <Field id={`${fid}-ifsc`} label="IFSC code">
            <input
              id={`${fid}-ifsc`}
              className="editor-field"
              value={content.bankIfsc}
              onChange={(e) => onChange({ bankIfsc: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field id={`${fid}-branch`} label="Branch" fullWidth>
            <input
              id={`${fid}-branch`}
              className="editor-field"
              value={content.bankBranch}
              onChange={(e) => onChange({ bankBranch: e.target.value })}
            />
          </Field>
          <Field id={`${fid}-acct-type`} label="Account type">
            <input
              id={`${fid}-acct-type`}
              className="editor-field"
              value={content.bankAccountType}
              onChange={(e) => onChange({ bankAccountType: e.target.value })}
              placeholder="Current / Savings"
            />
          </Field>
          <Field
            id={`${fid}-remit`}
            label="Remittance note"
            hint="Placeholder: {invoice}"
            fullWidth
          >
            <input
              id={`${fid}-remit`}
              className="editor-field"
              value={content.remittanceNote}
              onChange={(e) => onChange({ remittanceNote: e.target.value })}
              aria-describedby={`${fid}-remit-hint`}
            />
          </Field>
        </div>
      </SectionFrame>

      <SectionFrame
        title="UPI QR"
        onDelete={() => onChange({ showUpiQr: false })}
        onRestore={() => onChange({ showUpiQr: true })}
        removed={!content.showUpiQr}
      >
        <div className="editor-grid">
          <Field
            id={`${fid}-upi`}
            label="UPI ID"
            hint="QR is generated automatically from this UPI ID + payee name"
          >
            <input
              id={`${fid}-upi`}
              className="editor-field"
              value={content.upiId}
              onChange={(e) =>
                onChange({
                  upiId: e.target.value.trim(),
                  showUpiQr: true,
                })
              }
              placeholder="name@bank"
              aria-describedby={`${fid}-upi-hint`}
            />
          </Field>
          <Field id={`${fid}-payee`} label="Payee name on QR">
            <input
              id={`${fid}-payee`}
              className="editor-field"
              value={content.upiPayeeName}
              onChange={(e) => onChange({ upiPayeeName: e.target.value })}
            />
          </Field>
        </div>
        <div className="editor-qr-preview">
          {liveQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={liveQr} alt="Live UPI QR preview" width={140} height={140} />
          ) : (
            <p className="editor-hint">Enter a UPI ID to generate the QR code.</p>
          )}
          <div>
            <p className="editor-hint">
              {dueAmount > 0
                ? `Due QR includes amount ${dueAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}`
                : "No due amount — UPI QR is generated without a fixed amount."}
            </p>
            <button
              type="button"
              className="editor-btn"
              disabled={!content.upiId.trim()}
              onClick={() =>
                onChange({
                  showUpiQr: true,
                  showBankDetails: true,
                  upiPayeeName: content.upiPayeeName || content.bankAccountHolder,
                })
              }
            >
              Refresh QR
            </button>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame
        title="Authorized signature"
        onDelete={() =>
          onChange({ showSignatory: false, signatoryImageDataUrl: "" })
        }
        onRestore={() => onChange({ showSignatory: true, showBankDetails: true })}
        removed={!content.showSignatory}
      >
        <div className="editor-grid">
          <Field id={`${fid}-for`} label="‘For’ company line" fullWidth>
            <input
              id={`${fid}-for`}
              className="editor-field"
              value={content.signatoryForLabel}
              onChange={(e) => onChange({ signatoryForLabel: e.target.value })}
            />
          </Field>
          <Field id={`${fid}-sign-name`} label="Signatory name">
            <input
              id={`${fid}-sign-name`}
              className="editor-field"
              value={content.signatoryName}
              onChange={(e) => onChange({ signatoryName: e.target.value })}
            />
          </Field>
          <Field id={`${fid}-sign-title`} label="Title">
            <input
              id={`${fid}-sign-title`}
              className="editor-field"
              value={content.signatoryTitle}
              onChange={(e) => onChange({ signatoryTitle: e.target.value })}
            />
          </Field>
          <Field
            id={`${fid}-sign-file`}
            label="Upload signature image"
            hint="PNG or JPG, max 1.5 MB. Required for a real signature on the invoice."
            fullWidth
          >
            <input
              id={`${fid}-sign-file`}
              ref={fileRef}
              className="editor-field"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readSignature(file);
              }}
              aria-describedby={`${fid}-sign-file-hint`}
            />
          </Field>
        </div>
        {uploadError ? (
          <p className="editor-hint" role="alert" style={{ color: "#9b1c1c" }}>
            {uploadError}
          </p>
        ) : null}
        <div className="editor-sign-preview">
          {content.signatoryImageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.signatoryImageDataUrl}
              alt="Uploaded signature preview"
              className="editor-sign-preview__img"
            />
          ) : (
            <p className="editor-hint">No signature uploaded yet — upload an image above.</p>
          )}
          {content.signatoryImageDataUrl ? (
            <button
              type="button"
              className="editor-btn editor-btn--danger"
              onClick={() => {
                onChange({ signatoryImageDataUrl: "" });
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Remove uploaded signature
            </button>
          ) : null}
        </div>
      </SectionFrame>
    </>
  );
}
