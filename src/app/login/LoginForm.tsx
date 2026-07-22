"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/invoices";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      router.replace(nextPath.startsWith("/") ? nextPath : "/invoices");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(160deg, #0f172a, #1e293b 55%, #334155)",
        color: "#f8fafc",
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: "1.5rem",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "min(420px, 100%)",
          background: "rgba(15, 23, 42, 0.72)",
          border: "1px solid rgba(248,250,252,0.15)",
          padding: "2rem",
          display: "grid",
          gap: "1rem",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              letterSpacing: "0.14em",
              fontSize: "0.75rem",
              opacity: 0.7,
            }}
          >
            STUDIO ACCESS
          </p>
          <h1 style={{ margin: "0.35rem 0 0", fontSize: "1.8rem" }}>Sign in</h1>
          <p
            style={{
              margin: "0.5rem 0 0",
              opacity: 0.75,
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.95rem",
            }}
          >
            Enter your studio password to manage invoices.
          </p>
        </div>
        <label
          style={{ display: "grid", gap: "0.4rem", fontFamily: "system-ui, sans-serif" }}
        >
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              minHeight: 44,
              padding: "0 0.85rem",
              border: "1px solid rgba(248,250,252,0.25)",
              background: "#0b1220",
              color: "#fff",
              fontSize: "1rem",
            }}
          />
        </label>
        {error ? (
          <p
            role="alert"
            style={{ margin: 0, color: "#fecaca", fontFamily: "system-ui, sans-serif" }}
          >
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          style={{
            minHeight: 44,
            border: 0,
            background: "#f8fafc",
            color: "#0f172a",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {pending ? "Signing in…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
