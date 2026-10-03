"use client";

import Link from "next/link";
import { useEffect } from "react";
import { routes } from "@/lib/routes";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
        <p style={{ color: "#64748b" }}>
          An unexpected error occurred. You can retry or return to the invoice library.
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.65rem",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: "1.25rem",
          }}
        >
          <button type="button" onClick={() => reset()} className="studio-btn studio-btn--primary">
            Try again
          </button>
          <Link href={routes.invoices} className="studio-btn">
            Invoice library
          </Link>
          <Link href={routes.home} className="studio-btn">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
