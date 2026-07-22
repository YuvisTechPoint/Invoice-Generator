"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: string;
  clientName: string;
  clientEmail: string;
  total: number;
  invoiceDate: string;
  updatedAt: string;
};

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function InvoicesPage() {
  const router = useRouter();
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/invoices");
    const data = (await res.json()) as { invoices?: InvoiceListItem[]; error?: string };
    if (!res.ok) {
      setError(data.error || "Unable to load invoices");
      return;
    }
    setItems(data.invoices ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createInvoice() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices", { method: "POST", body: "{}" });
      const data = (await res.json()) as {
        invoice?: { id: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Create failed");
      router.push(`/editor?id=${encodeURIComponent(data.invoice!.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function openInvoice(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activate: true }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Unable to open invoice");
      }
      router.push(`/editor?id=${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open invoice");
    } finally {
      setBusy(false);
    }
  }

  async function removeInvoice(id: string) {
    if (!window.confirm("Delete this invoice permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Delete failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareLink(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(id)}/share`);
      const data = (await res.json()) as {
        urls?: { html?: string };
        error?: string;
      };
      if (!res.ok || !data.urls?.html) {
        throw new Error(data.error || "Unable to build share link");
      }
      const absolute = data.urls.html.startsWith("http")
        ? data.urls.html
        : `${window.location.origin}${data.urls.html}`;
      await navigator.clipboard.writeText(absolute);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to copy link");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f1ea",
        color: "#1c1917",
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: "1.5rem",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "flex-end",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ margin: 0, letterSpacing: "0.12em", fontSize: "0.75rem" }}>
              INVOICE LIBRARY
            </p>
            <h1 style={{ margin: "0.25rem 0 0", fontSize: "2rem" }}>Invoices</h1>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link
              href="/editor"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 40,
                padding: "0 1rem",
                border: "1px solid #1c1917",
                textDecoration: "none",
                color: "#1c1917",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 600,
              }}
            >
              Open editor
            </Link>
            <button
              type="button"
              onClick={() => void createInvoice()}
              disabled={busy}
              style={{
                minHeight: 40,
                padding: "0 1rem",
                border: 0,
                background: "#1c1917",
                color: "#f4f1ea",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              New invoice
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              style={{
                minHeight: 40,
                padding: "0 1rem",
                border: "1px solid #1c1917",
                background: "transparent",
                fontFamily: "system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        </header>

        {error ? (
          <p role="alert" style={{ color: "#9b1c1c", fontFamily: "system-ui, sans-serif" }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: "grid", gap: "0.75rem" }}>
          {items.length === 0 ? (
            <p style={{ fontFamily: "system-ui, sans-serif" }}>
              No invoices yet. Create your first invoice to get started.
            </p>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr auto",
                  gap: "0.75rem",
                  alignItems: "center",
                  padding: "1rem 1.1rem",
                  background: "#fff",
                  border: "1px solid #d6d3d1",
                }}
              >
                <div>
                  <strong style={{ fontSize: "1.05rem" }}>{item.invoiceNumber}</strong>
                  <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.9rem", opacity: 0.8 }}>
                    {item.clientName || "Untitled client"} · {item.status}
                  </div>
                </div>
                <div style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.9rem" }}>
                  <div>{formatInr(item.total)}</div>
                  <div style={{ opacity: 0.7 }}>{item.invoiceDate}</div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => void openInvoice(item.id)}
                    disabled={busy}
                    style={{
                      minHeight: 36,
                      padding: "0 0.8rem",
                      border: "1px solid #1c1917",
                      background: "#1c1917",
                      color: "#fff",
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Edit
                  </button>
                  <a
                    href={`/api/invoices/${encodeURIComponent(item.id)}/html`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 36,
                      padding: "0 0.8rem",
                      border: "1px solid #1c1917",
                      textDecoration: "none",
                      color: "#1c1917",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    View
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyShareLink(item.id)}
                    disabled={busy}
                    style={{
                      minHeight: 36,
                      padding: "0 0.8rem",
                      border: "1px solid #1c1917",
                      background: "transparent",
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeInvoice(item.id)}
                    disabled={busy}
                    style={{
                      minHeight: 36,
                      padding: "0 0.8rem",
                      border: "1px solid #9b1c1c",
                      background: "transparent",
                      color: "#9b1c1c",
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                    }}
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
  );
}
