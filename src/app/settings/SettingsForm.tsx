"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { INDIAN_STATES } from "@/lib/demo/invoiceDraft";
import { routes } from "@/lib/routes";

type SellerDefaults = {
  storeName: string;
  legalName: string;
  tagline: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
};

type SettingsResponse = {
  settings?: {
    invoicePrefix: string;
    sellerDefaults: SellerDefaults;
  };
  error?: string;
};

export default function SettingsForm() {
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [seller, setSeller] = useState<SellerDefaults | null>(null);
  const [status, setStatus] = useState("Loading settings…");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/settings")
      .then((res) => res.json())
      .then((data: SettingsResponse) => {
        if (!data.settings) {
          throw new Error(data.error || "Unable to load settings");
        }
        setInvoicePrefix(data.settings.invoicePrefix);
        setSeller(data.settings.sellerDefaults);
        setStatus("Loaded");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load settings");
      });
  }, []);

  function updateSeller(patch: Partial<SellerDefaults>) {
    setSeller((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!seller) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoicePrefix, sellerDefaults: seller }),
        });
        const data = (await res.json()) as SettingsResponse;
        if (!res.ok) throw new Error(data.error || "Save failed");
        setStatus("Settings saved");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  if (!seller) {
    return (
      <div className="studio-card" style={{ padding: "1.5rem" }}>
        {error ?? status}
      </div>
    );
  }

  return (
    <form className="studio-card" style={{ padding: "1.5rem" }} onSubmit={onSubmit}>
      {error ? (
        <p className="studio-alert studio-alert--error" role="alert">
          {error}
        </p>
      ) : null}

      <fieldset className="settings-fieldset">
        <legend>Invoice numbering</legend>
        <label className="settings-label" htmlFor="invoice-prefix">
          Prefix for new invoices
        </label>
        <input
          id="invoice-prefix"
          className="settings-input"
          value={invoicePrefix}
          onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
          placeholder="INV"
        />
        <p className="settings-hint">New invoices use {invoicePrefix || "INV"}-YYYY-0001 format.</p>
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>Default seller (your business)</legend>
        <div className="settings-grid">
          <label className="settings-label" htmlFor="store-name">
            Business name
          </label>
          <input
            id="store-name"
            className="settings-input"
            value={seller.storeName}
            onChange={(e) => updateSeller({ storeName: e.target.value })}
          />

          <label className="settings-label" htmlFor="legal-name">
            Legal name
          </label>
          <input
            id="legal-name"
            className="settings-input"
            value={seller.legalName}
            onChange={(e) => updateSeller({ legalName: e.target.value })}
          />

          <label className="settings-label" htmlFor="seller-email">
            Email
          </label>
          <input
            id="seller-email"
            className="settings-input"
            type="email"
            value={seller.email}
            onChange={(e) => updateSeller({ email: e.target.value })}
          />

          <label className="settings-label" htmlFor="seller-phone">
            Phone
          </label>
          <input
            id="seller-phone"
            className="settings-input"
            value={seller.phone}
            onChange={(e) => updateSeller({ phone: e.target.value })}
          />

          <label className="settings-label settings-label--full" htmlFor="seller-address">
            Address
          </label>
          <textarea
            id="seller-address"
            className="settings-textarea"
            rows={3}
            value={seller.address}
            onChange={(e) => updateSeller({ address: e.target.value })}
          />

          <label className="settings-label" htmlFor="seller-gstin">
            GSTIN
          </label>
          <input
            id="seller-gstin"
            className="settings-input"
            value={seller.gstin}
            onChange={(e) => updateSeller({ gstin: e.target.value })}
          />

          <label className="settings-label" htmlFor="seller-pan">
            PAN
          </label>
          <input
            id="seller-pan"
            className="settings-input"
            value={seller.pan}
            onChange={(e) => updateSeller({ pan: e.target.value })}
          />

          <label className="settings-label" htmlFor="seller-state">
            State
          </label>
          <select
            id="seller-state"
            className="settings-input"
            value={seller.state}
            onChange={(e) => updateSeller({ state: e.target.value })}
          >
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <label className="settings-label" htmlFor="seller-state-code">
            State code
          </label>
          <input
            id="seller-state-code"
            className="settings-input"
            value={seller.stateCode}
            onChange={(e) => updateSeller({ stateCode: e.target.value })}
          />
        </div>
      </fieldset>

      <div className="settings-actions">
        <button
          type="submit"
          className="studio-btn studio-btn--primary"
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Save settings"}
        </button>
        <Link href={routes.invoices} className="studio-btn">
          Back to library
        </Link>
      </div>

      <p className="settings-hint" role="status">
        {status}
      </p>
    </form>
  );
}
