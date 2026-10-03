"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkflowSteps from "@/components/WorkflowSteps";
import { absoluteUrl, routes } from "@/lib/routes";

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: string;
  clientName: string;
  clientEmail: string;
  total: number;
  invoiceDate: string;
  updatedAt: string;
};

type InvoicesClientProps = {
  initialInvoices: InvoiceListItem[];
  initialActiveId: string | null;
  initialError?: string | null;
};

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusClass(status: string): string {
  if (status === "issued") return "invoice-status invoice-status--issued";
  if (status === "paid") return "invoice-status invoice-status--paid";
  if (status === "void") return "invoice-status invoice-status--draft";
  return "invoice-status invoice-status--draft";
}

export default function InvoicesClient({
  initialInvoices,
  initialActiveId,
  initialError = null,
}: InvoicesClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialInvoices);
  const [activeInvoiceId, setActiveInvoiceId] = useState(initialActiveId);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setItems(initialInvoices);
    setActiveInvoiceId(initialActiveId);
  }, [initialInvoices, initialActiveId]);

  useEffect(() => {
    if (!initialError) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error")) return;
    url.searchParams.delete("error");
    url.searchParams.delete("id");
    url.searchParams.delete("message");
    window.history.replaceState({}, "", url.pathname);
  }, [initialError]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function reload() {
    const res = await fetch("/api/invoices");
    const data = (await res.json()) as {
      invoices?: InvoiceListItem[];
      activeInvoiceId?: string | null;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || "Unable to load invoices");
    }
    setItems(data.invoices ?? []);
    setActiveInvoiceId(data.activeInvoiceId ?? null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.invoiceNumber.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.clientEmail.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
    );
  }, [items, query]);

  function openInvoice(id: string) {
    void fetch(`/api/invoices/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activate: true }),
    }).finally(() => {
      router.push(routes.editor(id));
    });
  }

  async function removeInvoice(id: string) {
    if (!window.confirm("Delete this invoice permanently?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Delete failed");
      }
      setToast("Invoice deleted");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function voidInvoice(id: string) {
    if (!window.confirm("Mark this invoice as void? It stays in the library but is archived.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "void" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Unable to void invoice");
      }
      setToast("Invoice marked as void");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to void invoice");
    } finally {
      setBusy(false);
    }
  }

  async function duplicateInvoice(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/invoices/${encodeURIComponent(id)}/duplicate`,
        { method: "POST" }
      );
      const data = (await res.json()) as { invoice?: { id: string }; error?: string };
      if (!res.ok || !data.invoice?.id) {
        throw new Error(data.error || "Duplicate failed");
      }
      setToast("Invoice duplicated");
      router.push(routes.editor(data.invoice.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate failed");
    } finally {
      setBusy(false);
    }
  }

  async function issueAndCopyLink(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(routes.invoiceShare(id), { method: "POST" });
      const data = (await res.json()) as {
        urls?: { html?: string };
        error?: string;
      };
      if (!res.ok || !data.urls?.html) {
        throw new Error(data.error || "Unable to issue invoice");
      }
      await navigator.clipboard.writeText(absoluteUrl(data.urls.html));
      setToast("Issued — client link copied");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to copy link");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(id: string, invoiceNumber: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(routes.invoicePdf(id));
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "PDF download failed");
      }
      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Invoice-${invoiceNumber.replace(/[^\w.-]+/g, "-")}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      setToast("PDF downloaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setBusy(false);
    }
  }

  const editorHref = activeInvoiceId
    ? routes.editor(activeInvoiceId)
    : items[0]
      ? routes.editor(items[0].id)
      : routes.newInvoice;

  return (
    <>
      <main className="studio-main studio-main--invoices">
        <div className="studio-container">
          <WorkflowSteps
            current="library"
            invoiceId={activeInvoiceId ?? items[0]?.id}
            invoiceLabel={
              items.find((item) => item.id === activeInvoiceId)?.invoiceNumber ??
              items[0]?.invoiceNumber
            }
          />

          <div className="invoices-toolbar">
            <header className="studio-page-header">
              <p className="studio-page-header__eyebrow">Step 1 — Library</p>
              <h1 className="studio-page-header__title">Your invoices</h1>
              <p className="studio-page-header__desc">
                Pick an invoice to edit, or create a new one to start the workflow.
              </p>
            </header>

            <div className="invoices-actions">
              <Link href={editorHref} className="studio-btn studio-btn--sm">
                Continue in editor
              </Link>
              <Link href={routes.newInvoice} className="studio-btn studio-btn--primary studio-btn--sm">
                New invoice
              </Link>
            </div>
          </div>

          {error ? (
            <p className="studio-alert studio-alert--error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="invoices-search">
            <input
              type="search"
              className="invoices-search__input"
              placeholder="Search by number, client, email, or status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search invoices"
            />
          </div>

          <div className="studio-card invoices-card">
            {filtered.length === 0 ? (
              <div className="invoices-empty">
                <p className="studio-page-header__eyebrow invoices-empty__eyebrow">
                  {items.length === 0 ? "No invoices yet" : "No matches"}
                </p>
                <p>
                  {items.length === 0
                    ? "Create your first invoice to open the editor."
                    : "Try a different search term."}
                </p>
                {items.length === 0 ? (
                  <Link href={routes.newInvoice} className="studio-btn studio-btn--primary invoices-empty__cta">
                    Create first invoice
                  </Link>
                ) : null}
              </div>
            ) : (
              filtered.map((item) => (
                <article key={item.id} className="invoice-row">
                  <div className="invoice-row__main">
                    <strong className="invoice-row__number">{item.invoiceNumber}</strong>
                    <div className="invoice-row__meta">
                      {item.clientName || "Untitled client"}{" "}
                      <span className={statusClass(item.status)}>{item.status}</span>
                      {activeInvoiceId === item.id ? (
                        <span className="invoice-status invoice-status--issued invoice-status--active">
                          active
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="invoice-row__totals">
                    <div className="invoice-row__amount">{formatInr(item.total)}</div>
                    <div className="invoice-row__meta">{item.invoiceDate}</div>
                  </div>
                  <div className="invoice-row__actions">
                    <button
                      type="button"
                      onClick={() => openInvoice(item.id)}
                      disabled={busy || item.status === "void"}
                      className="studio-btn studio-btn--primary studio-btn--sm"
                    >
                      Edit
                    </button>
                    <a
                      href={routes.invoiceHtml(item.id, routes.invoices)}
                      target="_blank"
                      rel="noreferrer"
                      className="studio-btn studio-btn--sm"
                    >
                      Preview
                    </a>
                    <button
                      type="button"
                      onClick={() => void downloadPdf(item.id, item.invoiceNumber)}
                      disabled={busy}
                      className="studio-btn studio-btn--sm"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => void issueAndCopyLink(item.id)}
                      disabled={busy || item.status === "void"}
                      className="studio-btn studio-btn--sm"
                    >
                      Issue & copy
                    </button>
                    <button
                      type="button"
                      onClick={() => void duplicateInvoice(item.id)}
                      disabled={busy}
                      className="studio-btn studio-btn--sm"
                    >
                      Duplicate
                    </button>
                    {item.status !== "void" ? (
                      <button
                        type="button"
                        onClick={() => void voidInvoice(item.id)}
                        disabled={busy}
                        className="studio-btn studio-btn--sm"
                      >
                        Void
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void removeInvoice(item.id)}
                      disabled={busy}
                      className="studio-btn studio-btn--danger studio-btn--sm"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </main>

      {toast ? (
        <div className="studio-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </>
  );
}
