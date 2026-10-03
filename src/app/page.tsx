import Link from "next/link";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { REPO } from "@/lib/repo";
import { routes } from "@/lib/routes";
import StudioNav from "@/components/StudioNav";
import StudioFooter from "@/components/StudioFooter";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
};

const FEATURES = [
  {
    icon: "✎",
    title: "Visual editor",
    text: "Edit client details, line items, and totals with a live preview.",
  },
  {
    icon: "📄",
    title: "PDF download",
    text: "Export print-ready A4 PDFs with one click.",
  },
  {
    icon: "🔗",
    title: "Share links",
    text: "Send clients a link to view their invoice online.",
  },
  {
    icon: "📚",
    title: "Invoice library",
    text: "Save, search, and manage all your invoices in one place.",
  },
  {
    icon: "⚡",
    title: "Quick presets",
    text: "Start from templates and adjust rates in seconds.",
  },
  {
    icon: "🔒",
    title: "Secure links",
    text: "Shared invoice links use signed tokens for client access.",
  },
] as const;

const STEPS = [
  {
    title: "Create",
    text: "Start a new invoice or pick one from your library.",
  },
  {
    title: "Edit",
    text: "Fill in details and preview the invoice live.",
  },
  {
    title: "Send",
    text: "Download PDF or copy a link for your client.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="studio-shell">
      <StudioNav />

      <main className="studio-main">
        <section className="landing-hero">
          <div className="studio-container landing-hero__grid">
            <div>
              <span className="landing-hero__eyebrow">Open source · MIT · Free to use</span>
              <h1>Create professional invoices in minutes</h1>
              <p className="landing-hero__lead">{BRAND.description}</p>
              <div className="landing-hero__actions">
                <Link href={routes.newInvoice} className="studio-btn studio-btn--primary">
                  Create invoice
                </Link>
                <Link href={routes.invoices} className="studio-btn">
                  View library
                </Link>
              </div>
            </div>

            <aside className="landing-hero__panel" aria-label="App highlights">
              <h2>At a glance</h2>
              <div className="landing-hero__stat-grid">
                <div className="landing-stat">
                  <strong>Live</strong>
                  <span>Preview</span>
                </div>
                <div className="landing-stat">
                  <strong>PDF</strong>
                  <span>Export</span>
                </div>
                <div className="landing-stat">
                  <strong>Share</strong>
                  <span>Links</span>
                </div>
                <div className="landing-stat">
                  <strong>MIT</strong>
                  <span>Open source</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="landing-section">
          <div className="studio-container">
            <h2 className="landing-section__title">What you get</h2>
            <p className="landing-section__lead">
              Everything you need to create and send invoices — nothing extra.
            </p>
            <div className="landing-features">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="studio-card landing-feature">
                  <div className="landing-feature__icon" aria-hidden>
                    {feature.icon}
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" style={{ paddingTop: 0 }}>
          <div className="studio-container">
            <h2 className="landing-section__title">How it works</h2>
            <p className="landing-section__lead">Three simple steps.</p>
            <div className="landing-steps">
              {STEPS.map((step) => (
                <article key={step.title} className="studio-card landing-step">
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" style={{ paddingTop: 0 }}>
          <div className="studio-container">
            <div className="studio-card landing-oss">
              <h2 className="landing-section__title" style={{ marginTop: 0 }}>
                Open source
              </h2>
              <p className="landing-section__lead" style={{ marginBottom: "1rem" }}>
                Fork it, self-host it, or deploy to Vercel. Invoice Generator is
                MIT-licensed and built with Next.js, TypeScript, and Vercel Blob.
              </p>
              <a
                href={REPO.url}
                target="_blank"
                rel="noopener noreferrer"
                className="studio-btn"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        <section className="landing-section" style={{ paddingTop: 0 }}>
          <div className="studio-container">
            <div className="studio-card landing-cta">
              <h2>Ready to create your first invoice?</h2>
              <p>Start locally in seconds, or deploy your own copy to Vercel.</p>
              <div className="landing-cta__actions">
                <Link href={routes.newInvoice} className="studio-btn studio-btn--primary">
                  Create invoice
                </Link>
                <Link href={routes.invoices} className="studio-btn">
                  Open library
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <StudioFooter />
    </div>
  );
}
