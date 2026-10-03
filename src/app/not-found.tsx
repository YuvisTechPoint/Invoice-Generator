import Link from "next/link";
import StudioNav from "@/components/StudioNav";
import StudioFooter from "@/components/StudioFooter";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="studio-shell">
      <StudioNav />
      <main className="studio-main" style={{ padding: "3rem 0" }}>
        <div className="studio-container" style={{ textAlign: "center" }}>
          <p className="studio-page-header__eyebrow">404</p>
          <h1 className="studio-page-header__title">Page not found</h1>
          <p className="studio-page-header__desc" style={{ marginInline: "auto" }}>
            That page does not exist or may have been removed.
          </p>
          <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
            <Link href={routes.home} className="studio-btn">
              Home
            </Link>
            <Link href={routes.invoices} className="studio-btn studio-btn--primary">
              Invoice library
            </Link>
            <Link href={routes.newInvoice} className="studio-btn">
              New invoice
            </Link>
          </div>
        </div>
      </main>
      <StudioFooter />
    </div>
  );
}
