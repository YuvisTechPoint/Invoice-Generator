import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { REPO } from "@/lib/repo";
import { routes } from "@/lib/routes";

export default function StudioFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="studio-footer">
      <div className="studio-container studio-footer__inner">
        <p style={{ margin: 0 }}>
          © {year} {BRAND.name}. {BRAND.tagline}
          <span className="studio-footer__sep"> · </span>
          <a
            href={REPO.url}
            target="_blank"
            rel="noopener noreferrer"
            className="studio-footer__oss"
          >
            Open source (MIT)
          </a>
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href={routes.home}>Home</Link>
          <Link href={routes.invoices}>Library</Link>
          <Link href={routes.settings}>Settings</Link>
          <Link href={routes.newInvoice}>New invoice</Link>
          <a href={REPO.url} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
