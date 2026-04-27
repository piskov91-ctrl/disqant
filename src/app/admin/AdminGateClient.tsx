"use client";

import { useState } from "react";

export default function AdminGateClient({ onSuccess }: { onSuccess?: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) {
        setError(data.error || "Invalid password.");
        return;
      }
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" autoComplete="off">
      <div>
        <label className="block text-sm font-medium text-zinc-200">Admin password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          type="password"
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="none"
          placeholder="Enter password"
          className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-accent/60"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || password.trim().length === 0}
        className="btn-accent-gradient h-12 w-full px-8 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Checking…" : "Unlock admin"}
      </button>
    </form>
  );
}
