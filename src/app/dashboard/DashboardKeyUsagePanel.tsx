"use client";

import { useCallback, useMemo, useState } from "react";
import { RetailerDashboardClient } from "./RetailerDashboardClient";

type DashboardKeyUsagePanelProps = {
  initialApiKey: string;
  initialUsed: number;
  initialLimit: number;
};

export function DashboardKeyUsagePanel({
  initialApiKey,
  initialUsed,
  initialLimit,
}: DashboardKeyUsagePanelProps) {
  const [apiKeyInput, setApiKeyInput] = useState(initialApiKey);
  const [used, setUsed] = useState(initialUsed);
  const [limit, setLimit] = useState(initialLimit);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const remaining = useMemo(() => Math.max(0, limit - used), [limit, used]);
  const pct = useMemo(
    () => (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0),
    [used, limit],
  );
  const blocked = limit > 0 && used >= limit;

  const applyKey = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/retailer/client-usage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = (await res.json()) as {
        error?: string;
        usageCount?: number;
        usageLimit?: number;
      };
      if (!res.ok) {
        setError(data.error || "Could not load usage for this key.");
        return;
      }
      if (typeof data.usageCount === "number" && typeof data.usageLimit === "number") {
        setUsed(data.usageCount);
        setLimit(data.usageLimit);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [apiKeyInput]);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-400">API key</p>
          <p className="mt-1 text-xs text-zinc-500">
            Paste the key you use for <span className="font-mono text-zinc-400">data-fit-room-key</span> or{" "}
            <span className="font-mono text-zinc-400">?key=</span>, then load usage.
          </p>
          <label htmlFor="dash-api-key" className="sr-only">
            API key
          </label>
          <textarea
            id="dash-api-key"
            rows={3}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-accent/50"
            placeholder="Your Wear Me API key"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading || !apiKeyInput.trim()}
              onClick={() => void applyKey()}
              className="btn-accent-gradient inline-flex h-11 min-w-[10rem] items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading…" : "Load usage"}
            </button>
            {error ? (
              <p className="text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 shrink-0 sm:mt-8">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
              blocked
                ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {blocked ? "Limit reached" : "Active"}
          </span>
        </div>
      </div>

      <RetailerDashboardClient apiKey={apiKeyInput.trim() || initialApiKey} />

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6">
          <p className="text-sm font-medium text-zinc-400">Try-ons used</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{used}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6">
          <p className="text-sm font-medium text-zinc-400">Try-ons remaining</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{remaining}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6">
          <p className="text-sm font-medium text-zinc-400">Try-on limit</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{limit}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-zinc-300">
          <span>
            Try-ons used {used} / {limit}
          </span>
          <span className="tabular-nums text-zinc-400">{pct}% of limit</span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-zinc-950/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
