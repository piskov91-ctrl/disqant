"use client";

import { useCallback, useState } from "react";

export function DashboardEmailDeveloperPanel() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const resetOpen = useCallback(() => {
    setOpen(false);
    setEmail("");
    setError(null);
    setSent(false);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setSending(true);
    try {
      const res = await fetch("/api/retailer/email-install-instructions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.assign("/login?next=/dashboard");
        setError(data.error || "Could not send email.");
        return;
      }
      setSent(true);
      setEmail("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-5 py-5 backdrop-blur-sm md:px-6 md:py-6">
      {!open ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            Prefer someone else to install this? Send them the code and step-by-step notes by email.
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setError(null);
              setSent(false);
            }}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#c6a77d]/45 bg-[#c6a77d]/12 px-5 text-sm font-semibold text-[#f5efe6] transition hover:border-[#d4bc94]/55 hover:bg-[#c6a77d]/22"
          >
            Email to developer
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <p className="text-sm font-medium text-zinc-200">Send install instructions</p>
          <p className="text-xs text-zinc-500">
            We&apos;ll email your developer the Wear Me snippet plus the same platform steps you see below (Shopify,
            WordPress, Wix, Squarespace, and other sites).
          </p>
          <div>
            <label htmlFor="dev-email" className="block text-sm font-medium text-zinc-300">
              Developer email
            </label>
            <input
              id="dev-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@example.com"
              required
              className="mt-2 block w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-[#c6a77d]/50"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-300/90" role="alert">
              {error}
            </p>
          ) : null}
          {sent ? (
            <p className="text-sm text-emerald-300/90">Sent. Check the inbox for that address (and spam folder just in case).</p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#c6a77d] px-6 text-sm font-semibold text-zinc-950 transition hover:bg-[#d4b896] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send email"}
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => resetOpen()}
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 px-6 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
