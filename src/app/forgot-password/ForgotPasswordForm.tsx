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
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-100">
          If an account exists for that email, we&apos;ve sent a link to reset your password. The link works for 1 hour.
          Check your inbox and spam folder.
        </div>
        <p className="text-center text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-zinc-200 underline-offset-2 hover:underline">
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
          className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="btn-accent-gradient w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
