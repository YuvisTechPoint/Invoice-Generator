import "server-only";
import {
  atomicWriteJson,
  getSettingsPath,
  readJsonFile,
} from "@/lib/data/paths";
import { BRAND } from "@/lib/brand";
import { SELLER_STATE } from "@/lib/invoiceTotals";

export type StudioSettings = {
  invoicePrefix: string;
  counters: Record<string, number>;
  activeInvoiceId: string | null;
  sellerDefaults: {
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
};

const DEFAULT_SETTINGS: StudioSettings = {
  invoicePrefix: "INV",
  counters: {},
  activeInvoiceId: null,
  sellerDefaults: {
    storeName: BRAND.name,
    legalName: `M/S ${BRAND.name.toUpperCase()}`,
    tagline: BRAND.tagline,
    address: "Andheri East\nMumbai, Maharashtra, 400069",
    email: BRAND.email,
    phone: BRAND.phoneDisplay,
    website: `https://${BRAND.domain}/`,
    gstin: "27AAAAA0000A1Z5",
    pan: "AAAAA0000A",
    state: SELLER_STATE,
    stateCode: "27",
  },
};

export function getStudioSettings(): StudioSettings {
  const stored = readJsonFile<Partial<StudioSettings>>(
    getSettingsPath(),
    {}
  );
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    counters: { ...DEFAULT_SETTINGS.counters, ...(stored.counters ?? {}) },
    sellerDefaults: {
      ...DEFAULT_SETTINGS.sellerDefaults,
      ...(stored.sellerDefaults ?? {}),
    },
  };
}

export function saveStudioSettings(patch: Partial<StudioSettings>): StudioSettings {
  const current = getStudioSettings();
  const next: StudioSettings = {
    ...current,
    ...patch,
    counters: { ...current.counters, ...(patch.counters ?? {}) },
    sellerDefaults: {
      ...current.sellerDefaults,
      ...(patch.sellerDefaults ?? {}),
    },
  };
  atomicWriteJson(getSettingsPath(), next);
  return next;
}

/** Allocate next sequential invoice number: INV-2026-0001 */
export function allocateInvoiceNumber(date = new Date()): string {
  const settings = getStudioSettings();
  const year = String(date.getFullYear());
  const nextSeq = (settings.counters[year] ?? 0) + 1;
  saveStudioSettings({
    counters: { ...settings.counters, [year]: nextSeq },
  });
  const prefix = settings.invoicePrefix || "INV";
  return `${prefix}-${year}-${String(nextSeq).padStart(4, "0")}`;
}

export function allocateProjectRef(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PRJ-${year}${month}${day}-${suffix}`;
}

export function setActiveInvoiceId(id: string | null): void {
  saveStudioSettings({ activeInvoiceId: id });
}
