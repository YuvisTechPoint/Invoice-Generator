"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND } from "@/lib/brand";

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
    <main className="login-page">
      <div className="login-card">
        <p className="login-card__eyebrow">STUDIO ACCESS</p>
        <h1>Sign in</h1>
        <p className="login-card__desc">
          Enter your studio password to manage invoices.
        </p>

        <form onSubmit={onSubmit}>
          <label className="login-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
            />
          </label>

          {error ? (
            <p className="studio-alert studio-alert--error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="studio-btn studio-btn--primary"
            style={{ width: "100%", marginTop: "0.25rem" }}
          >
            {pending ? "Signing in…" : "Continue to studio"}
          </button>
        </form>

        <Link href="/" className="login-back">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
