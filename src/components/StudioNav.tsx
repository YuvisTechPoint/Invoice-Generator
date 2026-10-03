"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/api/readJsonResponse";
import { BRAND } from "@/lib/brand";
import { navKeyFromPath, routes, type NavKey } from "@/lib/routes";

type StudioNavProps = {
  /** Override auto-detected active tab */
  active?: NavKey;
};

function linkClass(isActive: boolean): string {
  const base = "studio-btn studio-btn--sm";
  return isActive
    ? `${base} studio-btn--primary`
    : `${base} studio-btn--ghost`;
}

export default function StudioNav({ active }: StudioNavProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const current = active ?? navKeyFromPath(pathname);
  const [editorHref, setEditorHref] = useState<string>(routes.newInvoice);
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/invoices")
      .then((res) => readJsonResponse<{ activeInvoiceId?: string | null; invoices?: { id: string }[] }>(res))
      .then((data) => {
        if (cancelled) return;
        const id = data.activeInvoiceId || data.invoices?.[0]?.id;
        setEditorHref(id ? routes.editor(id) : routes.newInvoice);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me")
      .then((res) => readJsonResponse<{ authRequired?: boolean; authenticated?: boolean }>(res))
      .then((data) => {
        if (cancelled) return;
        setAuthRequired(Boolean(data.authRequired));
        setAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    router.push(routes.login);
    router.refresh();
  }

  return (
    <header className="studio-nav">
      <div className="studio-container studio-nav__inner">
        <Link href={routes.home} className="studio-brand">
          <span className="studio-brand__mark" aria-hidden>
            IG
          </span>
          <span className="studio-brand__text">
            <span className="studio-brand__name">{BRAND.name}</span>
            <span className="studio-brand__tag">Simple &amp; fast</span>
          </span>
        </Link>

        <nav className="studio-nav__links" aria-label="Main">
          <Link
            href={routes.home}
            className={linkClass(current === "home")}
            aria-current={current === "home" ? "page" : undefined}
          >
            Home
          </Link>
          <Link
            href={routes.invoices}
            className={linkClass(current === "library")}
            aria-current={current === "library" ? "page" : undefined}
          >
            Library
          </Link>
          <Link
            href={editorHref}
            className={linkClass(current === "editor")}
            aria-current={current === "editor" ? "page" : undefined}
          >
            Editor
          </Link>
          <Link
            href={routes.settings}
            className={linkClass(current === "settings")}
            aria-current={current === "settings" ? "page" : undefined}
          >
            Settings
          </Link>
          <Link href={routes.newInvoice} className="studio-btn studio-btn--primary studio-btn--sm">
            + New invoice
          </Link>
          {authRequired && !authenticated ? (
            <Link href={routes.login} className="studio-btn studio-btn--sm">
              Sign in
            </Link>
          ) : null}
          {authRequired && authenticated ? (
            <button
              type="button"
              className="studio-btn studio-btn--sm studio-btn--ghost"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
