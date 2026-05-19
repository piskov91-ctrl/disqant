"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  RETAILER_PASSWORD_RULES_SUMMARY,
  validateRetailerPasswordStrength,
} from "@/lib/retailerPasswordPolicy";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="mt-8 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
        This reset link is missing or incomplete. Request a new link from the{" "}
        <Link href="/forgot-password" className="font-medium underline-offset-2 hover:underline">
          forgot password
        </Link>{" "}
        page.
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void (async () => {
      setError(null);
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      const v = validateRetailerPasswordStrength(password);
      if (v) {
        setError(v);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/retailer/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error || "Could not reset password.");
          return;
        }
        router.replace("/login?reset=success");
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="rp-password" className="block text-sm font-medium text-zinc-200">
          New password
        </label>
        <input
          id="rp-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
        />
      </div>
      <div>
        <label htmlFor="rp-confirm" className="block text-sm font-medium text-zinc-200">
          Confirm password
        </label>
        <input
          id="rp-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
        />
      </div>

      <ul className="list-inside list-disc space-y-1 text-xs text-zinc-500">
        {RETAILER_PASSWORD_RULES_SUMMARY.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="btn-accent-gradient w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<div className="mt-8 h-40 animate-pulse rounded-xl bg-zinc-900/50" />}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
