"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClientManagementTable, type ClientRow } from "@/components/ui/client-management-table";

type KeyRecord = {
  id: string;
  clientName: string;
  key: string;
  usageLimit: number;
  usageCount: number;
  createdAt: string;
};

function formatCreatedDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

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

  const clientRows = useMemo<ClientRow[]>(() => {
    return keys.map((k, idx) => ({
      id: k.id,
      number: String(idx + 1).padStart(2, "0"),
      clientName: k.clientName,
      apiKeyPrefix: (k.key || "").slice(0, 8),
      createdDate: formatCreatedDate(k.createdAt),
      usageCount: k.usageCount,
      usageLimit: k.usageLimit,
    }));
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
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
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

      <main className="mx-auto w-full max-w-none px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto w-full max-w-7xl">
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
              <div className="px-2 pb-2 pt-4 md:px-4">
                <ClientManagementTable
                  clients={clientRows}
                  onEdit={(id) => {
                    const rec = keys.find((k) => k.id === id);
                    if (rec) openEditModal(rec);
                  }}
                  onCopyCode={(id) => {
                    const rec = keys.find((k) => k.id === id);
                    if (rec) void copyWidgetCode(rec.key);
                  }}
                  onReset={(id) => {
                    void resetKeyUsage(id);
                  }}
                  onDelete={(id) => {
                    void deleteKey(id);
                  }}
                />
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

