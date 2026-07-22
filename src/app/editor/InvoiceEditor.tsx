"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  INDIAN_STATES,
  createEmptyLine,
  getDefaultInvoiceDraft,
  normalizeInvoiceDraft,
  type InvoiceDraft,
  type InvoiceDraftLine,
} from "@/lib/demo/invoiceDraft";
import {
  DEFAULT_INVOICE_CONTENT,
  type InvoiceSectionContent,
} from "@/features/invoice/invoiceContent";
import {
  PROJECT_PRESETS,
  SERVICE_TEMPLATES,
  lineFromTemplate,
  linesFromPreset,
  type ProjectPreset,
  type ServiceTemplate,
} from "@/lib/demo/serviceCatalog";
import InvoiceContentFields from "./InvoiceContentFields";
import PaymentSettlementPanel from "./PaymentSettlementPanel";
import { SectionFrame } from "./SectionFrame";
import "./editor.css";

type PreviewResponse = {
  draft: InvoiceDraft;
  orderId: string;
  html: string;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    platformFee: number;
    total: number;
  };
  urls: {
    html: string;
    print: string;
    page: string;
    pdf?: string;
  };
  error?: string;
};

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

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
      {hint ? <span className="editor-hint" id={`${id}-hint`}>{hint}</span> : null}
    </div>
  );
}

export default function InvoiceEditor({ initialDraft }: { initialDraft: InvoiceDraft }) {
  const formId = useId();
  const [draft, setDraft] = useState<InvoiceDraft>(() => normalizeInvoiceDraft(initialDraft));
  const [html, setHtml] = useState("");
  const [totals, setTotals] = useState<PreviewResponse["totals"] | null>(null);
  const [urls, setUrls] = useState<PreviewResponse["urls"] | null>(null);
  const [status, setStatus] = useState<string>("Loading invoice preview…");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef(draft);
  const previewRequestIdRef = useRef(0);
  const previewAbortRef = useRef<AbortController | null>(null);

  latestDraftRef.current = draft;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const applyPreview = useCallback(async (next: InvoiceDraft, persist: boolean) => {
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;
    const requestId = ++previewRequestIdRef.current;

    setError(null);
    try {
      const res = await fetch("/api/invoices/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: next, persist }),
        signal: controller.signal,
      });
      const data = (await res.json()) as PreviewResponse;
      if (requestId !== previewRequestIdRef.current) return null;
      if (!res.ok) {
        throw new Error(data.error || "Preview failed");
      }
      setHtml(data.html);
      setTotals(data.totals);
      setUrls(data.urls);
      setStatus(
        persist
          ? `Saved. Invoice available at ${data.urls.html}`
          : "Live preview updated"
      );
      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      if (requestId !== previewRequestIdRef.current) return null;
      const message = err instanceof Error ? err.message : "Unable to update invoice";
      setError(message);
      setStatus(message);
      return null;
    }
  }, []);

  useEffect(() => {
    void applyPreview(initialDraft, true);
  }, [applyPreview, initialDraft]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void applyPreview(latestDraftRef.current, false);
    }, 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, applyPreview]);

  useEffect(() => {
    const frame = previewRef.current;
    if (!frame || !html) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  function updateDraft(patch: Partial<InvoiceDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function updateSeller(patch: Partial<InvoiceDraft["seller"]>) {
    setDraft((prev) => ({ ...prev, seller: { ...prev.seller, ...patch } }));
  }

  function updateAddress(patch: Partial<InvoiceDraft["shippingAddress"]>) {
    setDraft((prev) => ({
      ...prev,
      shippingAddress: { ...prev.shippingAddress, ...patch },
    }));
  }

  function updateLine(id: string, patch: Partial<InvoiceDraftLine>) {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function addLine() {
    setDraft((prev) => ({ ...prev, items: [...prev.items, createEmptyLine()] }));
  }

  function addServiceTemplate(template: ServiceTemplate) {
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, lineFromTemplate(template)],
    }));
  }

  function applyProjectPreset(preset: ProjectPreset) {
    setDraft((prev) => {
      const items = linesFromPreset(preset);
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const discount = preset.discount ?? 0;
      const total = Math.max(0, subtotal - discount);
      const isPaid = prev.paymentStatus === "paid";
      return {
        ...prev,
        items,
        couponDiscount: discount,
        couponCode: preset.discountCode ?? "",
        content: {
          ...prev.content,
          amountPaidValue: isPaid ? total : prev.content.amountPaidValue,
          amountDueValue: isPaid ? 0 : total,
          settlementStatus: isPaid ? "paid" : "due",
        },
      };
    });
  }

  async function startBlankClientInvoice() {
    setError(null);
    setStatus("Creating new invoice…");
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as {
        invoice?: { id: string; draft: InvoiceDraft };
        error?: string;
      };
      if (!res.ok || !data.invoice?.draft) {
        throw new Error(data.error || "Unable to create invoice");
      }

      const created = normalizeInvoiceDraft(data.invoice.draft);
      const next: InvoiceDraft = {
        ...created,
        items: [
          {
            ...createEmptyLine(),
            name: "Custom development service",
            variantLabel: "Describe scope here",
            unitPrice: 0,
          },
        ],
        couponCode: "",
        couponDiscount: 0,
        shippingAddress: {
          ...created.shippingAddress,
          name: "",
          line1: "",
          line2: "",
          city: "",
          postalCode: "",
          phone: "",
        },
        email: "",
        customerPhone: "",
        paymentMethod: "upi",
        paymentStatus: "paid",
        content: {
          ...created.content,
          amountPaidValue: 0,
          amountDueValue: 0,
          settlementStatus: "paid",
        },
      };

      window.history.replaceState(
        null,
        "",
        `/editor?id=${encodeURIComponent(next.orderId)}`
      );
      setDraft(next);
      startTransition(() => {
        void applyPreview(next, true);
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create invoice";
      setError(message);
      setStatus(message);
    }
  }

  function removeLine(id: string) {
    setDraft((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((item) => item.id !== id) };
    });
  }

  function updateContent(patch: Partial<InvoiceSectionContent>) {
    setDraft((prev) => ({
      ...prev,
      content: { ...prev.content, ...patch },
    }));
  }

  function onSettlementChange(status: "paid" | "due") {
    const total = Math.max(0, Math.round((totals?.total ?? 0) * 100) / 100);
    setDraft((prev) => ({
      ...prev,
      paymentStatus: status === "paid" ? "paid" : "cod_pending",
      content: {
        ...prev.content,
        settlementStatus: status,
        showSettlementBar: true,
        amountPaidValue: status === "paid" ? total : 0,
        amountDueValue: status === "due" ? total : 0,
      },
    }));
  }

  function resetContentDefaults() {
    setDraft((prev) => ({
      ...prev,
      content: { ...DEFAULT_INVOICE_CONTENT },
    }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(() => {
      void applyPreview(draft, true);
    });
  }

  function resetDraft() {
    // Reload sample content into the *current* invoice (keep ids/number).
    const sample = getDefaultInvoiceDraft();
    const next = normalizeInvoiceDraft({
      ...sample,
      orderId: draft.orderId,
      invoiceNumber: draft.invoiceNumber,
      invoiceDate: draft.invoiceDate,
      seller: draft.seller,
    });
    setDraft(next);
    startTransition(() => {
      void applyPreview(next, true);
    });
  }

  async function copyClientLink() {
    const link = urls?.html;
    if (!link) return;
    const absolute =
      link.startsWith("http") ? link : `${window.location.origin}${link}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setStatus("Client invoice link copied to clipboard");
    } catch {
      setStatus(`Client link: ${absolute}`);
    }
  }

  async function issueAndShare() {
    setError(null);
    setStatus("Issuing invoice…");
    try {
      const saved = await applyPreview(latestDraftRef.current, true);
      if (!saved) throw new Error("Could not save invoice before issuing");

      const res = await fetch(
        `/api/invoices/${encodeURIComponent(latestDraftRef.current.orderId)}/share`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        urls?: { html?: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Unable to issue invoice");

      const link = data.urls?.html;
      if (link) {
        const absolute = link.startsWith("http")
          ? link
          : `${window.location.origin}${link}`;
        try {
          await navigator.clipboard.writeText(absolute);
          setStatus("Issued — client link copied");
        } catch {
          setStatus(`Issued — ${absolute}`);
        }
      } else {
        setStatus("Invoice issued");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to issue invoice";
      setError(message);
      setStatus(message);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function downloadInvoice() {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setStatus("Preparing PDF download…");
    setError(null);

    try {
      // Persist current draft first so PDF matches the live preview.
      const saved = await applyPreview(latestDraftRef.current, true);
      if (!saved) {
        throw new Error("Could not save invoice before PDF download");
      }

      const res = await fetch("/api/invoices/draft/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: latestDraftRef.current }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `PDF download failed (${res.status})`);
      }

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const looksLikePdf =
        bytes.length > 4 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46; // %PDF

      if (!looksLikePdf) {
        // Might be JSON error wrapped as 200 in rare proxies.
        const asText = new TextDecoder().decode(bytes.slice(0, 200));
        throw new Error(
          asText.includes("error")
            ? "PDF generation failed on the server"
            : `Server did not return a PDF file (${contentType || "unknown type"})`
        );
      }

      const filename = `Invoice-${(latestDraftRef.current.invoiceNumber || "draft").replace(/[^\w.-]+/g, "-")}.pdf`;
      const blob = new Blob([buffer], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Keep URL alive briefly so the browser can finish the download.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
      setStatus(`PDF downloaded — ${filename}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to download PDF";
      setError(message);
      setStatus(message);
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  const fid = (name: string) => `${formId}-${name}`;

  if (!hasMounted) {
    return (
      <div className="editor-shell" aria-busy="true">
        <header className="editor-header">
          <div>
            <h1>Client invoice drafter</h1>
            <p>Loading editor…</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="editor-shell">
      <a className="editor-skip" href="#invoice-preview">
        Skip to invoice preview
      </a>

      <header className="editor-header">
        <div>
          <h1>Client invoice drafter</h1>
          <p>
            Draft invoices for website and software development clients. Load a
            project preset, tweak services, save, then share the invoice link or print PDF.
          </p>
        </div>
        <div className="editor-header__actions">
          <a className="editor-btn" href="/invoices">
            Invoice library
          </a>
          <button
            type="button"
            className="editor-btn"
            onClick={() => void startBlankClientInvoice()}
          >
            New blank invoice
          </button>
          <button type="button" className="editor-btn" onClick={resetDraft}>
            Load sample project
          </button>
          {urls ? (
            <>
              <a className="editor-btn" href={urls.html} target="_blank" rel="noreferrer">
                Open invoice
              </a>
              <button
                type="button"
                className="editor-btn"
                onClick={() => void copyClientLink()}
              >
                Copy client link
              </button>
              <button
                type="button"
                className="editor-btn"
                onClick={() => void issueAndShare()}
              >
                Issue & copy link
              </button>
              <a className="editor-btn" href={urls.print} target="_blank" rel="noreferrer">
                Print / PDF
              </a>
              <button
                type="button"
                className="editor-btn"
                onClick={() => void downloadInvoice()}
                disabled={!html || isDownloadingPdf}
              >
                {isDownloadingPdf ? "Downloading PDF…" : "Download PDF"}
              </button>
            </>
          ) : null}
          <button
            type="submit"
            form={fid("form")}
            className="editor-btn editor-btn--primary"
            disabled={isPending}
          >
            {isPending ? "Updating…" : "Save invoice"}
          </button>
          <button type="button" className="editor-btn" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>

      <div
        className="editor-status"
        role="status"
        aria-live="polite"
        data-tone={error ? "error" : "info"}
      >
        {error ?? status}
      </div>

      <div className="editor-layout">
        <section className="editor-form-pane" aria-labelledby={fid("form-title")}>
          <h2 id={fid("form-title")} className="visually-hidden" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            Editable invoice fields
          </h2>

          <form id={fid("form")} onSubmit={onSubmit} noValidate>
            <fieldset className="editor-section">
              <legend>Quick start — project presets</legend>
              <p className="editor-hint" id={fid("presets-help")}>
                Load common website / software packages, then edit rates and client details.
              </p>
              <div className="editor-chip-row" role="group" aria-labelledby={fid("presets-help")}>
                {PROJECT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="editor-chip"
                    title={preset.description}
                    onClick={() => applyProjectPreset(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="editor-section">
              <legend>Invoice & project</legend>
              <div className="editor-grid">
                <Field id={fid("orderId")} label="Project reference">
                  <input
                    id={fid("orderId")}
                    className="editor-field"
                    value={draft.orderId}
                    onChange={(e) => updateDraft({ orderId: e.target.value })}
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field id={fid("invoiceNumber")} label="Invoice number">
                  <input
                    id={fid("invoiceNumber")}
                    className="editor-field"
                    value={draft.invoiceNumber}
                    onChange={(e) => updateDraft({ invoiceNumber: e.target.value })}
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field id={fid("orderDate")} label="Project / kickoff date">
                  <input
                    id={fid("orderDate")}
                    className="editor-field"
                    type="date"
                    value={draft.orderDate.slice(0, 10)}
                    onChange={(e) => updateDraft({ orderDate: e.target.value })}
                    required
                  />
                </Field>
                <Field id={fid("invoiceDate")} label="Invoice date">
                  <input
                    id={fid("invoiceDate")}
                    className="editor-field"
                    type="date"
                    value={draft.invoiceDate.slice(0, 10)}
                    onChange={(e) => updateDraft({ invoiceDate: e.target.value })}
                    required
                  />
                </Field>
                <Field id={fid("dueDate")} label="Payment due date">
                  <input
                    id={fid("dueDate")}
                    className="editor-field"
                    type="date"
                    value={(draft.dueDate || "").slice(0, 10)}
                    onChange={(e) => updateDraft({ dueDate: e.target.value })}
                  />
                </Field>
                <Field
                  id={fid("paymentTerms")}
                  label="Payment terms"
                  hint="Shown on the invoice meta grid and settlement bar"
                  fullWidth
                >
                  <input
                    id={fid("paymentTerms")}
                    className="editor-field"
                    value={draft.paymentTerms || ""}
                    onChange={(e) => updateDraft({ paymentTerms: e.target.value })}
                    placeholder="Net 15 — balance due within 15 days"
                    aria-describedby={`${fid("paymentTerms")}-hint`}
                  />
                </Field>
                <Field
                  id={fid("paidOnDate")}
                  label="Paid on date"
                  hint="Used when status is Paid"
                >
                  <input
                    id={fid("paidOnDate")}
                    className="editor-field"
                    type="date"
                    value={(draft.paidOnDate || "").slice(0, 10)}
                    onChange={(e) => updateDraft({ paidOnDate: e.target.value })}
                    aria-describedby={`${fid("paidOnDate")}-hint`}
                  />
                </Field>
                <Field id={fid("paymentMethod")} label="Payment method">
                  <select
                    id={fid("paymentMethod")}
                    className="editor-select"
                    value={draft.paymentMethod}
                    onChange={(e) =>
                      updateDraft({
                        paymentMethod: e.target.value as InvoiceDraft["paymentMethod"],
                      })
                    }
                  >
                    <option value="upi">UPI</option>
                    <option value="net_banking">Net Banking</option>
                    <option value="razorpay">Online (Razorpay)</option>
                    <option value="cod">Due on milestone</option>
                  </select>
                </Field>
                <Field
                  id={fid("paymentStatus")}
                  label="Payment status"
                  hint="Open/Print links work for Paid, Due on milestone, or Refunded"
                >
                  <select
                    id={fid("paymentStatus")}
                    className="editor-select"
                    value={draft.paymentStatus}
                    onChange={(e) => {
                      const paymentStatus = e.target
                        .value as InvoiceDraft["paymentStatus"];
                      const total = Math.max(
                        0,
                        Math.round((totals?.total ?? 0) * 100) / 100
                      );
                      const isPaid = paymentStatus === "paid";
                      setDraft((prev) => ({
                        ...prev,
                        paymentStatus,
                        paidOnDate: isPaid
                          ? prev.paidOnDate || prev.invoiceDate.slice(0, 10)
                          : "",
                        content: {
                          ...prev.content,
                          settlementStatus: isPaid ? "paid" : "due",
                          showSettlementBar: true,
                          amountPaidValue: isPaid ? total : 0,
                          amountDueValue: isPaid ? 0 : total,
                        },
                      }));
                    }}
                    aria-describedby={`${fid("paymentStatus")}-hint`}
                  >
                    <option value="paid">Paid</option>
                    <option value="cod_pending">Due on milestone</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </Field>
              </div>
            </fieldset>

            <fieldset className="editor-section">
              <legend>Your studio (service provider)</legend>
              <div className="editor-grid">
                <Field id={fid("seller-store")} label="Studio / trade name">
                  <input
                    id={fid("seller-store")}
                    className="editor-field"
                    value={draft.seller.storeName}
                    onChange={(e) => updateSeller({ storeName: e.target.value })}
                  />
                </Field>
                <Field
                  id={fid("seller-legal")}
                  label="Legal name (header)"
                  hint="Shown in the signatory block — e.g. For M/S NORTHLINE DIGITAL"
                >
                  <input
                    id={fid("seller-legal")}
                    className="editor-field"
                    value={draft.seller.legalName}
                    onChange={(e) => updateSeller({ legalName: e.target.value })}
                  />
                </Field>
                <Field
                  id={fid("seller-address")}
                  label="Address"
                  hint="One line per row — matches the letterhead layout"
                  fullWidth
                >
                  <textarea
                    id={fid("seller-address")}
                    className="editor-textarea"
                    value={draft.seller.address}
                    onChange={(e) => updateSeller({ address: e.target.value })}
                    rows={3}
                    aria-describedby={`${fid("seller-address")}-hint`}
                  />
                </Field>
                <Field id={fid("seller-gstin")} label="GSTIN">
                  <input
                    id={fid("seller-gstin")}
                    className="editor-field"
                    value={draft.seller.gstin}
                    onChange={(e) => updateSeller({ gstin: e.target.value })}
                    autoComplete="off"
                  />
                </Field>
                <Field id={fid("seller-phone")} label="Mobile">
                  <input
                    id={fid("seller-phone")}
                    className="editor-field"
                    type="tel"
                    value={draft.seller.phone}
                    onChange={(e) => updateSeller({ phone: e.target.value })}
                    placeholder="+91 …, +91 …"
                  />
                </Field>
                <Field id={fid("seller-website")} label="Website">
                  <input
                    id={fid("seller-website")}
                    className="editor-field"
                    value={draft.seller.website}
                    onChange={(e) => updateSeller({ website: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
                <Field id={fid("seller-email")} label="Email">
                  <input
                    id={fid("seller-email")}
                    className="editor-field"
                    type="email"
                    value={draft.seller.email}
                    onChange={(e) => updateSeller({ email: e.target.value })}
                    // Browser email extensions (e.g. Temp Mail) inject attrs before hydrate.
                    suppressHydrationWarning
                  />
                </Field>
                <Field id={fid("seller-pan")} label="PAN">
                  <input
                    id={fid("seller-pan")}
                    className="editor-field"
                    value={draft.seller.pan}
                    onChange={(e) => updateSeller({ pan: e.target.value })}
                    autoComplete="off"
                  />
                </Field>
                <Field id={fid("seller-state")} label="Seller state">
                  <select
                    id={fid("seller-state")}
                    className="editor-select"
                    value={draft.seller.state}
                    onChange={(e) => updateSeller({ state: e.target.value })}
                  >
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={fid("seller-stateCode")} label="State code">
                  <input
                    id={fid("seller-stateCode")}
                    className="editor-field"
                    value={draft.seller.stateCode}
                    onChange={(e) => updateSeller({ stateCode: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="editor-section">
              <legend>Client (bill to)</legend>
              <div className="editor-grid">
                <Field id={fid("customer-name")} label="Client / company name">
                  <input
                    id={fid("customer-name")}
                    className="editor-field"
                    value={draft.shippingAddress.name}
                    onChange={(e) => updateAddress({ name: e.target.value })}
                    autoComplete="organization"
                  />
                </Field>
                <Field id={fid("customer-email")} label="Accounts email">
                  <input
                    id={fid("customer-email")}
                    className="editor-field"
                    type="email"
                    value={draft.email}
                    onChange={(e) => updateDraft({ email: e.target.value })}
                    autoComplete="email"
                    // Browser email extensions (e.g. Temp Mail) inject attrs before hydrate.
                    suppressHydrationWarning
                  />
                </Field>
                <Field id={fid("customer-phone")} label="Client phone">
                  <input
                    id={fid("customer-phone")}
                    className="editor-field"
                    type="tel"
                    value={draft.customerPhone}
                    onChange={(e) => updateDraft({ customerPhone: e.target.value })}
                    autoComplete="tel"
                  />
                </Field>
                <Field id={fid("addr-phone")} label="Billing phone">
                  <input
                    id={fid("addr-phone")}
                    className="editor-field"
                    type="tel"
                    value={draft.shippingAddress.phone}
                    onChange={(e) => updateAddress({ phone: e.target.value })}
                  />
                </Field>
                <Field id={fid("addr-line1")} label="Billing address line 1" fullWidth>
                  <input
                    id={fid("addr-line1")}
                    className="editor-field"
                    value={draft.shippingAddress.line1}
                    onChange={(e) => updateAddress({ line1: e.target.value })}
                    autoComplete="address-line1"
                  />
                </Field>
                <Field id={fid("addr-line2")} label="Billing address line 2" fullWidth>
                  <input
                    id={fid("addr-line2")}
                    className="editor-field"
                    value={draft.shippingAddress.line2}
                    onChange={(e) => updateAddress({ line2: e.target.value })}
                    autoComplete="address-line2"
                  />
                </Field>
                <Field id={fid("addr-city")} label="City">
                  <input
                    id={fid("addr-city")}
                    className="editor-field"
                    value={draft.shippingAddress.city}
                    onChange={(e) => updateAddress({ city: e.target.value })}
                    autoComplete="address-level2"
                  />
                </Field>
                <Field id={fid("addr-state")} label="Client state">
                  <select
                    id={fid("addr-state")}
                    className="editor-select"
                    value={draft.shippingAddress.state}
                    onChange={(e) => updateAddress({ state: e.target.value })}
                  >
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={fid("addr-postal")} label="PIN code">
                  <input
                    id={fid("addr-postal")}
                    className="editor-field"
                    value={draft.shippingAddress.postalCode}
                    onChange={(e) => updateAddress({ postalCode: e.target.value })}
                    autoComplete="postal-code"
                    inputMode="numeric"
                  />
                </Field>
                <Field id={fid("addr-country")} label="Country">
                  <input
                    id={fid("addr-country")}
                    className="editor-field"
                    value={draft.shippingAddress.country}
                    onChange={(e) => updateAddress({ country: e.target.value })}
                    autoComplete="country-name"
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="editor-section">
              <legend>Discount & extra charges</legend>
              <div className="editor-grid">
                <Field id={fid("coupon")} label="Adjustment type">
                  <select
                    id={fid("coupon")}
                    className="editor-select"
                    value={(() => {
                      const options = [
                        "Previously Paid",
                        "Extra Discount",
                        "Discount",
                        "Advance",
                      ] as const;
                      const match = options.find(
                        (opt) =>
                          opt.toLowerCase() === draft.couponCode.trim().toLowerCase()
                      );
                      return match ?? "Discount";
                    })()}
                    onChange={(e) => updateDraft({ couponCode: e.target.value })}
                  >
                    <option value="Previously Paid">Previously Paid</option>
                    <option value="Extra Discount">Extra Discount</option>
                    <option value="Discount">Discount</option>
                    <option value="Advance">Advance</option>
                  </select>
                </Field>
                <Field id={fid("discount")} label="Amount (₹)">
                  <input
                    id={fid("discount")}
                    className="editor-field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.couponDiscount}
                    onChange={(e) =>
                      updateDraft({ couponDiscount: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field id={fid("shipping")} label="Delivery / setup fee (₹)">
                  <input
                    id={fid("shipping")}
                    className="editor-field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.shippingCharge}
                    onChange={(e) =>
                      updateDraft({ shippingCharge: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field id={fid("platform")} label="Other charges (₹)">
                  <input
                    id={fid("platform")}
                    className="editor-field"
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.platformFee}
                    onChange={(e) =>
                      updateDraft({ platformFee: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="editor-section">
              <legend>Services</legend>
              <p className="editor-hint" id={fid("items-help")}>
                Add a service template, then adjust qty / rate. Scope notes appear under each
                line on the invoice.
              </p>
              <div className="editor-chip-row" role="group" aria-label="Add service template">
                {SERVICE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="editor-chip editor-chip--muted"
                    onClick={() => addServiceTemplate(template)}
                  >
                    + {template.label}
                  </button>
                ))}
              </div>

              {draft.items.map((item, index) => {
                const base = fid(`item-${item.id}`);
                return (
                  <div
                    key={item.id}
                    className="editor-line"
                    role="group"
                    aria-labelledby={`${base}-title`}
                  >
                    <div className="editor-line__head">
                      <span className="editor-line__title" id={`${base}-title`}>
                        Service {index + 1}
                      </span>
                      <button
                        type="button"
                        className="editor-btn editor-btn--danger"
                        onClick={() => removeLine(item.id)}
                        disabled={draft.items.length <= 1}
                        aria-label={`Remove service ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="editor-grid">
                      <Field id={`${base}-name`} label="Service name" fullWidth>
                        <input
                          id={`${base}-name`}
                          className="editor-field"
                          value={item.name}
                          onChange={(e) => updateLine(item.id, { name: e.target.value })}
                          required
                        />
                      </Field>
                      <Field
                        id={`${base}-variant`}
                        label="Scope / notes"
                        fullWidth
                      >
                        <input
                          id={`${base}-variant`}
                          className="editor-field"
                          value={item.variantLabel}
                          onChange={(e) =>
                            updateLine(item.id, { variantLabel: e.target.value })
                          }
                          placeholder="Deliverables, milestones…"
                        />
                      </Field>
                      <Field id={`${base}-qty`} label="Quantity">
                        <input
                          id={`${base}-qty`}
                          className="editor-field"
                          type="number"
                          min={1}
                          step={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateLine(item.id, {
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                        />
                      </Field>
                      <Field id={`${base}-price`} label="Rate (₹)">
                        <input
                          id={`${base}-price`}
                          className="editor-field"
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLine(item.id, {
                              unitPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                      </Field>
                      <Field id={`${base}-pid`} label="Service ID">
                        <input
                          id={`${base}-pid`}
                          className="editor-field"
                          value={item.productId}
                          onChange={(e) =>
                            updateLine(item.id, { productId: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: "0.85rem" }}>
                <button type="button" className="editor-btn" onClick={addLine}>
                  Add blank service line
                </button>
              </div>

              {totals ? (
                <div className="editor-totals" aria-live="polite">
                  <span>Subtotal</span>
                  <strong>{formatInr(totals.subtotal)}</strong>
                  <span>Discount</span>
                  <strong>{formatInr(totals.discount)}</strong>
                  <span>Shipping</span>
                  <strong>{formatInr(totals.shipping)}</strong>
                  <span>Platform fee</span>
                  <strong>{formatInr(totals.platformFee)}</strong>
                  <span>Grand total</span>
                  <strong>{formatInr(totals.total)}</strong>
                </div>
              ) : null}
            </fieldset>

            <PaymentSettlementPanel
              content={draft.content}
              grandTotal={totals?.total ?? 0}
              onChange={updateContent}
              onSettlementChange={onSettlementChange}
            />

            <SectionFrame
              title="Payment note"
              onDelete={() => updateContent({ showPayment: false })}
              onRestore={() => updateContent({ showPayment: true })}
              removed={!draft.content.showPayment}
            >
              <Field id={fid("pay-note")} label="Note text (uses Paid / Due templates from section text below)" fullWidth>
                <p className="editor-hint">
                  Current note follows settlement status. Edit the Paid / Due note templates in
                  “Payment information” under section text customization.
                </p>
              </Field>
            </SectionFrame>

            <SectionFrame
              title="Terms & project contact"
              onDelete={() => updateContent({ showNotes: false })}
              onRestore={() => updateContent({ showNotes: true })}
              removed={!draft.content.showNotes}
            >
              <p className="editor-hint">
                Delivery, revisions, and contact lines. Fine-tune wording in section text
                customization below.
              </p>
            </SectionFrame>

            <SectionFrame
              title="Legal footer"
              onDelete={() => updateContent({ showFooter: false })}
              onRestore={() => updateContent({ showFooter: true })}
              removed={!draft.content.showFooter}
            >
              <p className="editor-hint">
                Disclaimer, jurisdiction, and copyright. Edit copy in section text customization.
              </p>
            </SectionFrame>

            <InvoiceContentFields
              formId={formId}
              content={draft.content}
              onChange={updateContent}
              onResetDefaults={resetContentDefaults}
            />
          </form>
        </section>

        <section
          className="editor-preview-pane"
          id="invoice-preview"
          aria-labelledby={fid("preview-title")}
        >
          <h2 id={fid("preview-title")}>Live invoice preview</h2>
          <iframe
            ref={previewRef}
            className="editor-preview-frame"
            title="Generated invoice preview"
            sandbox="allow-same-origin allow-modals allow-popups allow-scripts"
          />
        </section>
      </div>
    </div>
  );
}
