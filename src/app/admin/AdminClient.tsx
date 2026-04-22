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
  const [editing, setEditing] = useState<KeyRecord | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editFashnApiKey, setEditFashnApiKey] = useState("");
  const [editUsageLimit, setEditUsageLimit] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
    }
  }

  async function resetKeyUsage(id: string) {
    const ok = window.confirm("Reset usage counter to 0 for this client?");
    if (!ok) return;

    setError(null);
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
    }
  }

  async function copyWidgetCode(apiKey: string) {
    const origin = window.location.origin;
    const snippet = `<script async src=\"${origin}/widget.js\" data-disquant-key=\"${apiKey}\"></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = snippet;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function openEditModal(rec: KeyRecord) {
    setError(null);
    setEditing(rec);
    setEditClientName(rec.clientName);
    setEditUsageLimit(String(rec.usageLimit));
    setEditFashnApiKey("");
  }

  function closeEditModal() {
    setEditing(null);
    setEditClientName("");
    setEditFashnApiKey("");
    setEditUsageLimit("");
    setSavingEdit(false);
  }

  async function saveEdit() {
    if (!editing) return;
    setError(null);
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/keys/${encodeURIComponent(editing.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: editClientName,
          ...(editFashnApiKey.trim() ? { fashnApiKey: editFashnApiKey.trim() } : null),
          usageLimit: Number(editUsageLimit),
        }),
      });
      const data = (await res.json()) as { key?: KeyRecord; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to update key.");
        return;
      }
      if (data.key) {
        setKeys((prev) => prev.map((k) => (k.id === data.key!.id ? data.key! : k)));
      }
      closeEditModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update key.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-surface-border bg-white p-6 shadow-xl shadow-zinc-200/80">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p id="edit-title" className="text-base font-semibold text-zinc-900">
                  Edit client
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Update client name, usage limit, and (optionally) replace the Fashn.ai API key.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-surface-border bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-surface-raised"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900">Client name</label>
                <input
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="mt-3 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-accent/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900">Fashn.ai API key</label>
                <input
                  value={editFashnApiKey}
                  onChange={(e) => setEditFashnApiKey(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                  className="mt-3 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-accent/60"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  For security, we never display the current key. Enter a new one only if you want to replace it.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-900">Usage limit</label>
                <input
                  value={editUsageLimit}
                  onChange={(e) => setEditUsageLimit(e.target.value)}
                  inputMode="numeric"
                  className="mt-3 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-accent/60"
                />
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-surface-border bg-white text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={
                  savingEdit || editClientName.trim().length === 0 || Number(editUsageLimit) <= 0
                }
                className="btn-accent-gradient h-11 flex-1 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="border-b border-surface-border bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-6 md:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              D
            </span>
            Disquant
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-zinc-600 transition hover:text-zinc-900">
              Back to landing
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-zinc-600 transition hover:text-zinc-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
                Admin · Clients
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Create clients with usage limits. Keys are stored in Redis (Upstash/Vercel).
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-full border border-surface-border bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
          </div>

          <section className="mt-8 rounded-2xl border border-surface-border bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-base font-semibold text-zinc-900">Create new client</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Create a client API key with a usage limit.
            </p>

            <form onSubmit={createKey} className="mt-6 grid gap-4 md:grid-cols-12 md:items-end">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-zinc-900">Client name</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Acme Storefront"
                  className="mt-2 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition focus:border-accent/60"
                />
              </div>
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-zinc-900">Fashn.ai API key</label>
                <input
                  value={fashnApiKey}
                  onChange={(e) => setFashnApiKey(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="fa-…"
                  className="mt-2 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition focus:border-accent/60"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-900">Usage limit</label>
                <input
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  inputMode="numeric"
                  placeholder="1000"
                  className="mt-2 block w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition focus:border-accent/60"
                />
              </div>
              <div className="md:col-span-12">
                <button
                  type="submit"
                  disabled={
                    creating ||
                    clientName.trim().length === 0 ||
                    fashnApiKey.trim().length === 0 ||
                    Number(usageLimit) <= 0
                  }
                  className="btn-accent-gradient h-12 w-full px-8 text-sm disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {creating ? "Creating…" : "Create API key"}
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}
          </section>

          <section className="mt-8 rounded-2xl border border-surface-border bg-white p-0 shadow-sm">
            <div className="flex flex-col gap-1 border-b border-surface-border px-6 py-5 md:flex-row md:items-end md:justify-between md:px-8">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Clients</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {keys.length} total · Usage {remainingTotal.used}/{remainingTotal.limit}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="px-6 py-10 text-sm text-zinc-500 md:px-8">Loading…</div>
            ) : keys.length === 0 ? (
              <div className="px-6 py-10 text-sm text-zinc-500 md:px-8">No clients yet.</div>
            ) : (
              <div className="w-full">
                <table className="w-full table-fixed border-separate border-spacing-0">
                  <colgroup>
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "5%" }} />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      <th className="border-b border-surface-border px-6 py-3 md:px-8">
                        Client Name
                      </th>
                      <th className="border-b border-surface-border px-6 py-3 md:px-8">API Key</th>
                      <th className="border-b border-surface-border px-6 py-3 md:px-8">
                        Usage / Limit
                      </th>
                      <th className="border-b border-surface-border px-6 py-3 md:px-8">Status</th>
                      <th className="border-b border-surface-border px-2 py-3 text-center">Edit</th>
                      <th className="border-b border-surface-border px-2 py-3 text-center">Copy</th>
                      <th className="border-b border-surface-border px-2 py-3 text-center">Reset</th>
                      <th className="border-b border-surface-border px-2 py-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {keys.map((k) => {
                      const pct =
                        k.usageLimit > 0
                          ? Math.min(100, Math.round((k.usageCount / k.usageLimit) * 100))
                          : 0;
                      const blocked = k.usageLimit > 0 && k.usageCount >= k.usageLimit;
                      return (
                        <tr key={k.id} className="align-middle">
                          <td className="border-b border-surface-border px-6 py-5 md:px-8">
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-zinc-900">
                                {k.clientName}
                              </p>
                            </div>
                          </td>
                          <td className="border-b border-surface-border px-6 py-5 md:px-8">
                            <span className="rounded-lg border border-surface-border bg-white px-2.5 py-1 font-mono text-xs text-zinc-700">
                              {(k.key || "").slice(0, 8)}…
                            </span>
                          </td>
                          <td className="border-b border-surface-border px-6 py-5 md:px-8">
                            <div className="flex items-center gap-4">
                              <div className="h-2 w-44 overflow-hidden rounded-full border border-surface-border bg-surface-muted">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-zinc-700">
                                {k.usageCount}/{k.usageLimit}
                              </span>
                              <span className="text-xs font-semibold text-zinc-600">{pct}%</span>
                            </div>
                          </td>
                          <td className="border-b border-surface-border px-6 py-5 md:px-8">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                blocked
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                              }`}
                            >
                              {blocked ? "Blocked" : "Active"}
                            </span>
                          </td>
                          <td className="border-b border-surface-border px-2 py-5 text-center">
                            <button
                              type="button"
                              onClick={() => openEditModal(k)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-surface-border bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-surface-raised"
                            >
                              Edit
                            </button>
                          </td>
                          <td className="border-b border-surface-border px-2 py-5 text-center">
                            <button
                              type="button"
                              onClick={() => void copyWidgetCode(k.key)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-surface-border bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-surface-raised"
                            >
                              Copy
                            </button>
                          </td>
                          <td className="border-b border-surface-border px-2 py-5 text-center">
                            <button
                              type="button"
                              onClick={() => void resetKeyUsage(k.id)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-surface-border bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-surface-raised"
                            >
                              Reset
                            </button>
                          </td>
                          <td className="border-b border-surface-border px-2 py-5 text-center">
                            <button
                              type="button"
                              onClick={() => void deleteKey(k.id)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="px-6 py-5 text-xs text-zinc-500 md:px-8">
              Stored in Redis under <span className="font-mono">disquant:clientKeys:*</span>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

