"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { TryOnTimingCharts } from "@/components/TryOnTimingCharts";
import { AdminWearMeClient } from "@/app/admin/AdminWearMeClient";

type KeyRecord = {
  id: string;
  clientName: string;
  key: string;
  usageLimit: number;
  usageCount: number;
  createdAt: string;
};

type ClientAnalyticsRow = {
  kind: "client";
  clientId: string;
  clientName: string;
  visits: number;
  tryOns: number;
  lastActive: string | null;
};

type DemoVisitorAnalyticsRow = {
  kind: "demo";
  label: string;
  sessionId: string | null;
  lastIp: string;
  visits: number;
  tryOns: number;
  lastActive: string | null;
};

type AnalyticsSummary = {
  demoVisitsToday: number;
  demoVisitsThisMonth: number;
  tryOnsTotal: number;
  tryOnsRetailer: number;
  tryOnsVisitor: number;
  clients: ClientAnalyticsRow[];
  demoVisitors: DemoVisitorAnalyticsRow[];
  tryOnByHourUtc: number[];
  tryOnByWeekdayUtc: number[];
};

type AdminTab = "clients" | "analytics" | "wearMe";

const CREDIT_PLANS = [
  {
    name: "Starter",
    tryOns: 300,
    credits: 600,
    fashnCost: 34,
    price: 149,
    profit: 115,
  },
  {
    name: "Growth",
    tryOns: 600,
    credits: 1200,
    fashnCost: 68,
    price: 299,
    profit: 231,
  },
  {
    name: "Pro",
    tryOns: 1200,
    credits: 2400,
    fashnCost: 136,
    price: 599,
    profit: 463,
  },
] as const;

/** Per-try-on unit economics from Starter (linear Fashn cost). */
const FASHN_GBP_PER_TRYON = 34 / 300;
const RECOMMENDED_GBP_PER_TRYON = 149 / 300;

function formatGbp(n: number) {
  return `£${n.toFixed(2)}`;
}

export default function AdminClient() {
  const [activeTab, setActiveTab] = useState<AdminTab>("clients");
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

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [creditCalcOpen, setCreditCalcOpen] = useState(false);
  const [calcTryOnsInput, setCalcTryOnsInput] = useState("");
  /** Which client key powers admin Wear Me (retailer `/api/tryon`, not the public demo). */
  const [wearMeKeyId, setWearMeKeyId] = useState<string | null>(null);

  const remainingTotal = useMemo(() => {
    const used = keys.reduce((s, k) => s + k.usageCount, 0);
    const limit = keys.reduce((s, k) => s + k.usageLimit, 0);
    return { used, limit };
  }, [keys]);

  const tryOnBreakdownPct = useMemo(() => {
    if (!analytics || analytics.tryOnsTotal <= 0) return { retailer: 0, visitor: 0 };
    return {
      retailer: Math.round((analytics.tryOnsRetailer / analytics.tryOnsTotal) * 100),
      visitor: Math.round((analytics.tryOnsVisitor / analytics.tryOnsTotal) * 100),
    };
  }, [analytics]);

  const calcResult = useMemo(() => {
    const n = Number.parseInt(calcTryOnsInput.trim(), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    const credits = n * 2;
    const fashnCost = n * FASHN_GBP_PER_TRYON;
    const recommendedPrice = n * RECOMMENDED_GBP_PER_TRYON;
    const profit = recommendedPrice - fashnCost;
    return { tryOns: n, credits, fashnCost, recommendedPrice, profit };
  }, [calcTryOnsInput]);

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

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      const data = (await res.json()) as AnalyticsSummary & { error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setAnalyticsError(data.error || "Failed to load analytics.");
        return;
      }
      const h = Array.isArray(data.tryOnByHourUtc) ? data.tryOnByHourUtc : [];
      const w = Array.isArray(data.tryOnByWeekdayUtc) ? data.tryOnByWeekdayUtc : [];
      setAnalytics({
        demoVisitsToday: data.demoVisitsToday,
        demoVisitsThisMonth: data.demoVisitsThisMonth,
        tryOnsTotal: data.tryOnsTotal,
        tryOnsRetailer: data.tryOnsRetailer,
        tryOnsVisitor: data.tryOnsVisitor,
        clients: Array.isArray(data.clients) ? data.clients : [],
        demoVisitors: Array.isArray(data.demoVisitors) ? data.demoVisitors : [],
        tryOnByHourUtc: Array.from({ length: 24 }, (_, i) =>
          typeof h[i] === "number" && Number.isFinite(h[i]) ? h[i] : 0,
        ),
        tryOnByWeekdayUtc: Array.from({ length: 7 }, (_, i) =>
          typeof w[i] === "number" && Number.isFinite(w[i]) ? w[i] : 0,
        ),
      });
    } catch (e) {
      setAnalyticsError(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (keys.length === 0) {
      setWearMeKeyId(null);
      return;
    }
    setWearMeKeyId((prev) => (prev && keys.some((k) => k.id === prev) ? prev : keys[0]!.id));
  }, [keys]);

  useEffect(() => {
    if (activeTab === "analytics") void loadAnalytics();
  }, [activeTab]);

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
    const ok = window.confirm("Reset try-ons used to 0 for this client?");
    if (!ok) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/keys/${encodeURIComponent(id)}/reset`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: true; usageCount?: number; error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to reset try-ons used.");
        return;
      }
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, usageCount: 0 } : k)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset try-ons used.");
    }
  }

  async function copyWidgetCode(apiKey: string) {
    const origin = window.location.origin;
    const snippet = `<script async src=\"${origin}/widget.js\" data-disquant-key=\"${apiKey}\"></script>`;
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
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

  async function copyRawKey(apiKey: string) {
    try {
      await navigator.clipboard.writeText(apiKey);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = apiKey;
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

  function refreshCurrentTab() {
    if (activeTab === "clients" || activeTab === "wearMe") void load();
    else void loadAnalytics();
  }

  const tabBusy =
    activeTab === "clients" || activeTab === "wearMe" ? loading : analyticsLoading;

  const wearMeKeyRecord = useMemo(
    () => keys.find((k) => k.id === wearMeKeyId) ?? null,
    [keys, wearMeKeyId],
  );

  return (
    <div className="min-h-dvh w-full bg-zinc-950 px-8 text-zinc-100">
      {creditCalcOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credit-calc-title"
        >
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p id="credit-calc-title" className="text-base font-semibold text-zinc-100">
                  Credit Calculator
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Try-On Max uses 2 Fashn credits per try-on. Figures are illustrative GBP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreditCalcOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3 tabular-nums">Try-ons</th>
                    <th className="px-4 py-3 tabular-nums">Credits</th>
                    <th className="px-4 py-3 tabular-nums">Fashn cost</th>
                    <th className="px-4 py-3 tabular-nums">Price</th>
                    <th className="px-4 py-3 tabular-nums">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_PLANS.map((row) => (
                    <tr key={row.name} className="border-b border-zinc-800/80 last:border-0">
                      <td className="px-4 py-3 font-medium text-zinc-100">{row.name}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">{row.tryOns}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">{row.credits}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">£{row.fashnCost}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-300">£{row.price}</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-400/90">£{row.profit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
              <h3 className="text-sm font-semibold text-zinc-100">Custom package</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Recommended price uses the Starter plan rate (£149 ÷ 300 try-ons). Fashn cost scales linearly
                (£34 ÷ 300).
              </p>
              <label className="mt-4 block text-sm font-medium text-zinc-200">Number of try-ons</label>
              <input
                value={calcTryOnsInput}
                onChange={(e) => setCalcTryOnsInput(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 450"
                className="mt-2 block w-full max-w-xs rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
              />
              {calcResult ? (
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Credits</dt>
                    <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-100">
                      {calcResult.credits.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Fashn cost (est.)</dt>
                    <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-100">
                      {formatGbp(calcResult.fashnCost)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Recommended price (est.)
                    </dt>
                    <dd className="mt-1 tabular-nums text-lg font-semibold text-zinc-100">
                      {formatGbp(calcResult.recommendedPrice)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Profit (est.)</dt>
                    <dd className="mt-1 tabular-nums text-lg font-semibold text-emerald-400/90">
                      {formatGbp(calcResult.profit)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">Enter a positive whole number of try-ons.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setCreditCalcOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-title"
        >
          <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl md:w-[720px]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p id="edit-title" className="text-base font-semibold text-zinc-100">
                  Edit client
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Update client name, try-on limit, and (optionally) replace the Fashn.ai API key.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-200">Client name</label>
                <input
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200">Fashn.ai API key</label>
                <input
                  value={editFashnApiKey}
                  onChange={(e) => setEditFashnApiKey(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                  className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  For security, we never display the current key. Enter a new one only if you want to replace it.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-200">Try-on limit</label>
                <input
                  value={editUsageLimit}
                  onChange={(e) => setEditUsageLimit(e.target.value)}
                  inputMode="numeric"
                  className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
                />
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={savingEdit}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
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
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between px-6 md:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              D
            </span>
            Disquant
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-100">
              Back to landing
            </Link>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-zinc-400 transition hover:text-zinc-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="w-full py-8">
        <div className="w-full">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-100 md:text-4xl">
                Admin
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Manage client keys and view platform analytics.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCreditCalcOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
              >
                Credit Calculator
              </button>
              <button
                type="button"
                onClick={refreshCurrentTab}
                disabled={tabBusy}
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 px-5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
          </div>

          <div
            className="mt-6 inline-flex rounded-full border border-zinc-800 bg-zinc-900/80 p-1"
            role="tablist"
            aria-label="Admin sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "clients"}
              onClick={() => setActiveTab("clients")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "clients"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Clients
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "analytics"}
              onClick={() => setActiveTab("analytics")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "analytics"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Analytics
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "wearMe"}
              onClick={() => setActiveTab("wearMe")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "wearMe"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Wear Me
            </button>
          </div>

          {activeTab === "clients" ? (
            <>
              <section className="mt-8 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm md:p-8">
                <h2 className="text-base font-semibold text-zinc-100">Create new client</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Create a client API key with a try-on limit.
                </p>

                <form onSubmit={createKey} className="mt-6 grid gap-4 md:grid-cols-12 md:items-end">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-zinc-200">Client name</label>
                    <input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Acme Storefront"
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-accent/60"
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-zinc-200">Fashn.ai API key</label>
                    <input
                      value={fashnApiKey}
                      onChange={(e) => setFashnApiKey(e.target.value)}
                      type="password"
                      autoComplete="new-password"
                      placeholder="fa-…"
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-accent/60"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-200">Try-on limit</label>
                    <input
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      inputMode="numeric"
                      placeholder="1000"
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-accent/60"
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
                  <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}
              </section>

              <section className="mt-8 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-0 shadow-sm">
                <div className="flex flex-col gap-1 border-b border-zinc-800 px-6 py-5 md:flex-row md:items-end md:justify-between md:px-8">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-100">Clients</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {keys.length} clients · Try-ons used {remainingTotal.used} / {remainingTotal.limit} try-on limit
                      (summed across clients)
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="px-6 py-10 text-sm text-zinc-500 md:px-8">Loading…</div>
                ) : keys.length === 0 ? (
                  <div className="px-6 py-10 text-sm text-zinc-500 md:px-8">No clients yet.</div>
                ) : (
                  <div className="w-full">
                    <div className="grid w-full grid-cols-[minmax(0,1.35fr)_minmax(0,0.7fr)_minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_minmax(0,0.6fr)_minmax(0,0.7fr)] gap-2 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 md:px-6">
                      <div>Client Name</div>
                      <div>API Key</div>
                      <div>Try-ons used / Try-on limit</div>
                      <div>Status</div>
                      <div className="text-center">EDIT</div>
                      <div className="text-center">COPY</div>
                      <div className="text-center">COPY KEY</div>
                      <div className="text-center">RESET</div>
                      <div className="text-center">DELETE</div>
                    </div>

                    {keys.map((k) => {
                      const pct =
                        k.usageLimit > 0
                          ? Math.min(100, Math.round((k.usageCount / k.usageLimit) * 100))
                          : 0;
                      const blocked = k.usageLimit > 0 && k.usageCount >= k.usageLimit;

                      return (
                        <div
                          key={k.id}
                          className="grid w-full grid-cols-[minmax(0,1.35fr)_minmax(0,0.7fr)_minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_minmax(0,0.7fr)_minmax(0,0.55fr)_minmax(0,0.6fr)_minmax(0,0.7fr)] items-center gap-2 border-b border-zinc-800 px-4 py-4 text-base md:px-6"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-zinc-100">{k.clientName}</div>
                          </div>
                          <div>
                            <span className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm text-zinc-300">
                              {(k.key || "").slice(0, 8)}…
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-zinc-300">
                              {k.usageCount}/{k.usageLimit}
                            </span>
                            <span className="text-sm font-semibold text-zinc-500">{pct}%</span>
                          </div>
                          <div>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${
                                blocked
                                  ? "border-amber-800/80 bg-amber-950/50 text-amber-200"
                                  : "border-emerald-800/80 bg-emerald-950/50 text-emerald-200"
                              }`}
                            >
                              {blocked ? "Blocked" : "Active"}
                            </span>
                          </div>
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => openEditModal(k)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
                              aria-label="Edit"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => void copyWidgetCode(k.key)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
                              aria-label="Copy code"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => void copyRawKey(k.key)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
                              aria-label="Copy key"
                            >
                              Copy Key
                            </button>
                          </div>
                          <div className="text-center">
                            <button
                              type="button"
                            onClick={() => void resetKeyUsage(k.id)}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-700"
                            aria-label="Reset try-ons used"
                          >
                            Reset
                            </button>
                          </div>
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => void deleteKey(k.id)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-red-900/60 bg-red-950/40 px-3 text-sm font-semibold text-red-200 transition hover:border-red-800 hover:bg-red-950/70"
                              aria-label="Delete"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="px-6 py-5 text-xs text-zinc-500 md:px-8">
                  Stored in Redis under <span className="font-mono text-zinc-400">disquant:clientKeys:*</span>.
                </p>
              </section>
            </>
          ) : activeTab === "wearMe" ? (
            <section className="mt-8 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm md:p-8">
              <h2 className="text-base font-semibold text-zinc-100">Wear Me</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Quick try-on test using the selected client&apos;s API key (counts against their quota).
              </p>

              {loading ? (
                <div className="mt-8 text-sm text-zinc-500">Loading clients…</div>
              ) : keys.length === 0 ? (
                <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-400">
                  Create a client API key on the Clients tab first, then return here to test try-on against that
                  key.
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <div className="max-w-xl">
                    <label htmlFor="admin-wearme-key" className="block text-sm font-medium text-zinc-200">
                      Client for this session
                    </label>
                    <select
                      id="admin-wearme-key"
                      value={wearMeKeyId ?? ""}
                      onChange={(e) => setWearMeKeyId(e.target.value || null)}
                      className="mt-2 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-accent/60"
                    >
                      {keys.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.clientName} · {k.usageCount}/{k.usageLimit} try-ons used
                        </option>
                      ))}
                    </select>
                    {wearMeKeyRecord ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Requests use header{" "}
                        <span className="font-mono text-zinc-400">x-api-key</span> for this client&apos;s
                        Disquant key (prefix{" "}
                        <span className="font-mono text-zinc-400">
                          {(wearMeKeyRecord.key || "").slice(0, 8)}…
                        </span>
                        ).
                      </p>
                    ) : null}
                  </div>
                  {wearMeKeyRecord ? (
                    <AdminWearMeClient key={wearMeKeyRecord.id} apiKey={wearMeKeyRecord.key} />
                  ) : null}
                </div>
              )}
            </section>
          ) : (
            <section className="mt-8 w-full space-y-6">
              {analyticsError ? (
                <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                  {analyticsError}
                </div>
              ) : null}

              {analyticsLoading && !analytics ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-12 text-sm text-zinc-500">
                  Loading analytics…
                </div>
              ) : analytics ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Demo visits (today)
                      </p>
                      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-100">
                        {analytics.demoVisitsToday.toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">UTC day · /demo page loads</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Demo visits (this month)
                      </p>
                      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-100">
                        {analytics.demoVisitsThisMonth.toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">UTC calendar month</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:col-span-2 lg:col-span-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Try-ons completed
                      </p>
                      <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-100">
                        {analytics.tryOnsTotal.toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">Successful Fashn runs (all time)</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8">
                    <h2 className="text-base font-semibold text-zinc-100">Retailer vs demo / visitor</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Split by whether the request included a client API key (embedded widget) or used the demo
                      fallback path.
                    </p>

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-300">Retailer (API key in request)</span>
                          <span className="tabular-nums text-sm text-zinc-500">
                            {analytics.tryOnsRetailer.toLocaleString()} ({tryOnBreakdownPct.retailer}%)
                          </span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                            style={{
                              width:
                                analytics.tryOnsTotal > 0
                                  ? `${(analytics.tryOnsRetailer / analytics.tryOnsTotal) * 100}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-300">Demo / visitor (no key)</span>
                          <span className="tabular-nums text-sm text-zinc-500">
                            {analytics.tryOnsVisitor.toLocaleString()} ({tryOnBreakdownPct.visitor}%)
                          </span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                            style={{
                              width:
                                analytics.tryOnsTotal > 0
                                  ? `${(analytics.tryOnsVisitor / analytics.tryOnsTotal) * 100}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <TryOnTimingCharts
                    variant="admin"
                    subtitle="All completed try-ons across the platform."
                    tryOnByHourUtc={analytics.tryOnByHourUtc}
                    tryOnByWeekdayUtc={analytics.tryOnByWeekdayUtc}
                  />

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-0 overflow-hidden">
                    <div className="border-b border-zinc-800 px-6 py-5 md:px-8">
                      <h2 className="text-base font-semibold text-zinc-100">Clients (widget + API key)</h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        Visits = widget load beacons; try-ons = completed Fashn runs with this client&apos;s key in
                        the request. Names are from your client list.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            <th className="px-6 py-3 md:px-8">Client</th>
                            <th className="px-4 py-3 tabular-nums">Visits</th>
                            <th className="px-4 py-3 tabular-nums">Try-ons</th>
                            <th className="px-6 py-3 md:px-8">Last active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.clients.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-8 text-zinc-500 md:px-8">
                                No clients in the database.
                              </td>
                            </tr>
                          ) : (
                            analytics.clients.map((row) => (
                              <tr key={row.clientId} className="border-b border-zinc-800/80 last:border-0">
                                <td className="px-6 py-4 font-medium text-zinc-100 md:px-8">{row.clientName}</td>
                                <td className="px-4 py-4 tabular-nums text-zinc-300">{row.visits.toLocaleString()}</td>
                                <td className="px-4 py-4 tabular-nums text-zinc-300">{row.tryOns.toLocaleString()}</td>
                                <td className="px-6 py-4 text-zinc-400 md:px-8">
                                  {row.lastActive
                                    ? new Date(row.lastActive).toLocaleString(undefined, {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-0 overflow-hidden">
                    <div className="border-b border-zinc-800 px-6 py-5 md:px-8">
                      <h2 className="text-base font-semibold text-zinc-100">Demo visitors</h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        /demo page loads and try-ons without a client API key. Session cookie when available; otherwise
                        IP only. Up to 250 most recently active rows.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            <th className="px-6 py-3 md:px-8">Visitor</th>
                            <th className="px-4 py-3">Session / IP</th>
                            <th className="px-4 py-3 tabular-nums">Visits</th>
                            <th className="px-4 py-3 tabular-nums">Try-ons</th>
                            <th className="px-6 py-3 md:px-8">Last active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.demoVisitors.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-zinc-500 md:px-8">
                                No demo visitor activity recorded yet.
                              </td>
                            </tr>
                          ) : (
                            analytics.demoVisitors.map((row, i) => (
                              <tr
                                key={`${row.label}-${row.lastIp}-${i}`}
                                className="border-b border-zinc-800/80 last:border-0"
                              >
                                <td className="max-w-[220px] px-6 py-4 text-zinc-200 md:px-8">
                                  <span className="line-clamp-2" title={row.label}>
                                    {row.label}
                                  </span>
                                </td>
                                <td className="px-4 py-4 font-mono text-xs text-zinc-400">
                                  {row.sessionId ? (
                                    <span title={row.sessionId}>{row.sessionId.slice(0, 12)}…</span>
                                  ) : (
                                    <span title={row.lastIp}>{row.lastIp}</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 tabular-nums text-zinc-300">{row.visits.toLocaleString()}</td>
                                <td className="px-4 py-4 tabular-nums text-zinc-300">{row.tryOns.toLocaleString()}</td>
                                <td className="px-6 py-4 text-zinc-400 md:px-8">
                                  {row.lastActive
                                    ? new Date(row.lastActive).toLocaleString(undefined, {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
