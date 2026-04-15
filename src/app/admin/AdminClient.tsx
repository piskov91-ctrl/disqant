"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type KeyRecord = {
  id: string;
  clientName: string;
  key: string;
  usageLimit: number;
  usageCount: number;
  createdAt: string;
};

export default function AdminClient() {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [fashnApiKey, setFashnApiKey] = useState("");
  const [usageLimit, setUsageLimit] = useState("1000");
  const [creating, setCreating] = useState(false);

  const remainingTotal = useMemo(() => {
    const used = keys.reduce((s, k) => s + k.usageCount, 0);
    const limit = keys.reduce((s, k) => s + k.usageLimit, 0);
    return { used, limit };
  }, [keys]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/keys");
      const data = (await res.json()) as { keys?: KeyRecord[]; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to load keys.");
        return;
      }
      setKeys(data.keys || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load keys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          fashnApiKey,
          usageLimit: Number(usageLimit),
        }),
      });
      const data = (await res.json()) as { key?: KeyRecord; error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to create key.");
        return;
      }
      if (data.key) {
        setKeys((prev) => [data.key!, ...prev]);
        setClientName("");
        setFashnApiKey("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key.");
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await fetch("/api/admin-auth", { method: "DELETE" });
    window.location.reload();
  }

  async function deleteKey(id: string) {
    const ok = window.confirm("Delete this API key? This cannot be undone.");
    if (!ok) return;

    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to delete key.");
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete key.");
    } finally {
      setDeletingId(null);
    }
  }

  async function resetKeyUsage(id: string) {
    const ok = window.confirm("Reset usage counter to 0 for this client?");
    if (!ok) return;

    setError(null);
    setResettingId(id);
    try {
      const res = await fetch(`/api/admin/keys/${encodeURIComponent(id)}/reset`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: true; usageCount?: number; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to reset usage.");
        return;
      }
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, usageCount: 0 } : k)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset usage.");
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              D
            </span>
            Disquant
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-white">
              Back to landing
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="lg:w-[420px]">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Admin · API keys
            </h1>
            <p className="mt-4 text-zinc-400">
              Create client API keys with usage limits. Keys are stored in Redis (Upstash/Vercel).
            </p>

            <form onSubmit={createKey} className="mt-8 space-y-5">
              <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-5">
                <label className="block text-sm font-medium text-white">Client name</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Acme Storefront"
                  className="mt-3 block w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-accent/60"
                />
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-5">
                <label className="block text-sm font-medium text-white">Fashn.ai API key</label>
                <input
                  value={fashnApiKey}
                  onChange={(e) => setFashnApiKey(e.target.value)}
                  placeholder="fa-…"
                  className="mt-3 block w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-accent/60"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Stored server-side only. Not shown in the UI after saving.
                </p>
              </div>

              <div className="rounded-2xl border border-surface-border bg-surface-raised/30 p-5">
                <label className="block text-sm font-medium text-white">Usage limit</label>
                <input
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  inputMode="numeric"
                  placeholder="1000"
                  className="mt-3 block w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-zinc-200 outline-none transition focus:border-accent/60"
                />
                <p className="mt-2 text-xs text-zinc-500">Total allowed calls before blocking.</p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={creating || clientName.trim().length === 0 || fashnApiKey.trim().length === 0}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-8 text-sm font-semibold text-white shadow-[0_0_48px_-12px_rgba(124,92,255,0.45)] transition hover:bg-accent-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create API key"}
              </button>

              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-surface-border bg-transparent text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh list
              </button>
            </form>
          </div>

          <div className="flex-1">
            <div className="rounded-2xl border border-surface-border bg-surface-raised/20 p-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Keys</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {keys.length} total · Usage {remainingTotal.used}/{remainingTotal.limit}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-surface-border">
                <div className="grid grid-cols-12 gap-4 border-b border-surface-border bg-zinc-950/40 px-6 py-3 text-xs text-zinc-500">
                  <div className="col-span-3">Client</div>
                  <div className="col-span-4">Key</div>
                  <div className="col-span-2 text-right">Used</div>
                  <div className="col-span-2 pr-4 text-right">Limit</div>
                  <div className="col-span-1 pl-4 text-right">Actions</div>
                </div>
                <div className="divide-y divide-surface-border">
                  {loading ? (
                    <div className="px-4 py-10 text-center text-sm text-zinc-500">Loading…</div>
                  ) : keys.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-zinc-500">
                      No keys yet.
                    </div>
                  ) : (
                    keys.map((k) => (
                      <div
                        key={k.id}
                        className="grid grid-cols-12 gap-4 px-6 py-3 text-sm text-zinc-200"
                      >
                        <div className="col-span-3 truncate text-white">{k.clientName}</div>
                        <div className="col-span-4 truncate font-mono text-xs text-zinc-300">
                          {k.key}
                        </div>
                        <div className="col-span-2 text-right text-zinc-300">{k.usageCount}</div>
                        <div className="col-span-2 pr-4 text-right text-zinc-300">{k.usageLimit}</div>
                        <div className="col-span-1 flex justify-end pl-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => resetKeyUsage(k.id)}
                              disabled={resettingId === k.id}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-surface-border bg-surface-raised/30 px-4 text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Reset usage for ${k.clientName}`}
                            >
                              {resettingId === k.id ? "Resetting…" : "Reset"}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteKey(k.id)}
                              disabled={deletingId === k.id}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-red-500/50 bg-red-500/15 px-4 text-sm font-semibold text-red-100 transition hover:border-red-400/70 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Delete key for ${k.clientName}`}
                            >
                              {deletingId === k.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                Stored in Redis under <span className="font-mono">disquant:clientKeys:*</span>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

