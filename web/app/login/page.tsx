"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <span className="brand">
          <span className="brand__dot" />
          Receipts
        </span>
        <h1>Sign in</h1>
        <p className="sub">
          Multiplayer review for your published receipts. Enter your email and
          we&apos;ll send a magic link.
        </p>

        {status === "sent" ? (
          <div className="notice notice--ok">
            <strong>Check your email.</strong> We sent a sign-in link to{" "}
            <span className="mono">{email}</span>. Open it on this device to
            continue.
          </div>
        ) : (
          <form className="auth-form" onSubmit={onSubmit}>
            <div>
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {status === "error" && error && (
              <div className="notice notice--err">{error}</div>
            )}

            <button
              className="btn btn--primary"
              type="submit"
              disabled={status === "sending" || !email.trim()}
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
