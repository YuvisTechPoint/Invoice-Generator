import type { Metadata } from "next";
import StudioNav from "@/components/StudioNav";
import StudioFooter from "@/components/StudioFooter";
import StorageBanner from "@/components/StorageBanner";
import { getStorageStatus } from "@/lib/data/jsonStorage";
import { getStudioSettings } from "@/lib/data/settingsStore";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = {
  title: "Settings",
  description: "Business defaults and invoice numbering",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, storage] = await Promise.all([
    getStudioSettings(),
    Promise.resolve(getStorageStatus()),
  ]);

  return (
    <div className="studio-shell">
      <StudioNav active="settings" />
      <main className="studio-main" style={{ padding: "1.5rem 0 2rem" }}>
        <div className="studio-container">
          <header className="studio-page-header" style={{ marginBottom: "1.5rem" }}>
            <p className="studio-page-header__eyebrow">Studio</p>
            <h1 className="studio-page-header__title">Settings</h1>
            <p className="studio-page-header__desc">
              Default seller details and invoice numbering for new invoices.
            </p>
          </header>
          <div style={{ display: "grid", gap: "1rem" }}>
            <StorageBanner status={storage} />
            <SettingsForm initialSettings={settings} storagePersistent={storage.persistent} />
          </div>
        </div>
      </main>
      <StudioFooter />
    </div>
  );
}
