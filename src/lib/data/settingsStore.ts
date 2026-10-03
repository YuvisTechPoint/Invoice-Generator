import "server-only";
import { BRAND } from "@/lib/brand";
import { SELLER_STATE } from "@/lib/invoiceTotals";
import {
  SETTINGS_STORAGE_KEY,
  readStorageJson,
  writeStorageJson,
} from "@/lib/data/jsonStorage";

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
    address: "Your city, state, India",
    email: BRAND.email,
    phone: BRAND.phoneDisplay,
    website: `https://${BRAND.domain}/`,
    gstin: "27AAAAA0000A1Z5",
    pan: "AAAAA0000A",
    state: SELLER_STATE,
    stateCode: "27",
  },
};

export async function getStudioSettings(): Promise<StudioSettings> {
  const stored = await readStorageJson<Partial<StudioSettings>>(
    SETTINGS_STORAGE_KEY,
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

export async function saveStudioSettings(
  patch: Partial<StudioSettings>
): Promise<StudioSettings> {
  const current = await getStudioSettings();
  const next: StudioSettings = {
    ...current,
    ...patch,
    counters: { ...current.counters, ...(patch.counters ?? {}) },
    sellerDefaults: {
      ...current.sellerDefaults,
      ...(patch.sellerDefaults ?? {}),
    },
  };
  await writeStorageJson(SETTINGS_STORAGE_KEY, next);
  return next;
}

/** Allocate next sequential invoice number: INV-2026-0001 */
export async function allocateInvoiceNumber(date = new Date()): Promise<string> {
  const year = String(date.getFullYear());

  for (let attempt = 0; attempt < 8; attempt++) {
    const settings = await getStudioSettings();
    const prefix = settings.invoicePrefix || "INV";
    const nextSeq = (settings.counters[year] ?? 0) + 1;
    await saveStudioSettings({
      counters: { ...settings.counters, [year]: nextSeq },
    });

    const verify = await getStudioSettings();
    if (verify.counters[year] === nextSeq) {
      return `${prefix}-${year}-${String(nextSeq).padStart(4, "0")}`;
    }
  }

  throw new Error(
    "Unable to allocate invoice number. Retry or check storage permissions."
  );
}

export function allocateProjectRef(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PRJ-${year}${month}${day}-${suffix}`;
}

export async function setActiveInvoiceId(id: string | null): Promise<void> {
  await saveStudioSettings({ activeInvoiceId: id });
}
