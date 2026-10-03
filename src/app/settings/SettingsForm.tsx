"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { readJsonResponse } from "@/lib/api/readJsonResponse";
import type { StudioSettings } from "@/lib/data/settingsStore";
import { INDIAN_STATES } from "@/lib/demo/invoiceDraft";
import { routes } from "@/lib/routes";

type SellerDefaults = StudioSettings["sellerDefaults"];

type SettingsResponse = {
  settings?: StudioSettings;
  error?: string;
};

type SettingsFormProps = {
  initialSettings: StudioSettings;
  storagePersistent: boolean;
};

export default function SettingsForm({
  initialSettings,
  storagePersistent,
}: SettingsFormProps) {
  const [invoicePrefix, setInvoicePrefix] = useState(initialSettings.invoicePrefix);
  const [seller, setSeller] = useState<SellerDefaults>(initialSettings.sellerDefaults);
  const [status, setStatus] = useState("Loaded");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateSeller(patch: Partial<SellerDefaults>) {
    setSeller((prev) => ({ ...prev, ...patch }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoicePrefix, sellerDefaults: seller }),
        });
        const data = await readJsonResponse<SettingsResponse>(res);
        if (!res.ok) throw new Error(data.error || "Save failed");
        if (data.settings) {
          setInvoicePrefix(data.settings.invoicePrefix);
          setSeller(data.settings.sellerDefaults);
        }
        setStatus(storagePersistent ? "Settings saved" : "Saved for this session only (connect Blob on Vercel)");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
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
