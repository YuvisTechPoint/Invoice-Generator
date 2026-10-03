"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#f8f6f1",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ marginTop: 0 }}>Application error</h1>
          <p style={{ color: "#64748b" }}>
            {error.message || "The app hit an unrecoverable error."}
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
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: 42,
                padding: "0 1.1rem",
                borderRadius: 999,
                border: 0,
                background: "#1d4ed8",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <Link href={routes.home} style={{ color: "#1d4ed8" }}>
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
