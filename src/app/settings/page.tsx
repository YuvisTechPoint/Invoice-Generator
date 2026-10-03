import type { Metadata } from "next";
import StudioNav from "@/components/StudioNav";
import StudioFooter from "@/components/StudioFooter";
import SettingsForm from "./SettingsForm";

export const metadata: Metadata = {
  title: "Settings",
  description: "Business defaults and invoice numbering",
};

export default function SettingsPage() {
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
          <SettingsForm />
        </div>
      </main>
      <StudioFooter />
    </div>
  );
}
