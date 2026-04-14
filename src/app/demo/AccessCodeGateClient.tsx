"use client";

import { useState } from "react";

export default function AccessCodeGateClient() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demo-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) {
        setError(data.error || "Invalid code.");
        return;
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-white">Access code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          inputMode="text"
          placeholder="Enter code"
          className="mt-2 block w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-accent/60"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || code.trim().length === 0}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white shadow-[0_0_48px_-12px_rgba(124,92,255,0.45)] transition hover:bg-accent-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Checking…" : "Unlock demo"}
      </button>
    </form>
  );
}

