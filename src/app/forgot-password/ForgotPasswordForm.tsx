"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/retailer/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = (await res.json()) as { error?: string; message?: string };
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
        setDone(true);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }

  if (done) {
    return (
      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/25 px-4 py-4 text-sm leading-relaxed text-emerald-100/95">
          If an account exists for that email, we&apos;ve sent a link to reset your password. The link works for 1 hour.
          Check your inbox and spam folder.
        </div>
        <p className="text-center text-sm text-zinc-500">
          <Link
            href="/login"
            className="font-medium text-[#d4bc94] underline-offset-2 transition hover:text-[#e8dcc8] hover:underline"
          >
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="fp-email" className="block text-sm font-medium text-zinc-200">
          Email
        </label>
        <input
          id="fp-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-2 block w-full rounded-xl border border-zinc-700/90 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-600 focus:border-[#c6a77d]/50 focus:ring-2 focus:ring-[#c6a77d]/20"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <button type="submit" disabled={loading} className="wear-me-btn w-full disabled:cursor-not-allowed">
        {loading ? "Sending…" : "Send Reset Link"}
      </button>
    </form>
  );
}
