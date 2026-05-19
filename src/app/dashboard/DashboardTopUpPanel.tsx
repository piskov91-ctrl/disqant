"use client";

import { useCallback, useState } from "react";
import type { TopUpPackId } from "@/lib/topUpPacks";
import { TOP_UP_PACKS } from "@/lib/topUpPacks";

export function DashboardTopUpPanel() {
  const [loadingPack, setLoadingPack] = useState<TopUpPackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async (packId: TopUpPackId) => {
    setError(null);
    setLoadingPack(packId);
    try {
      const res = await fetch("/api/stripe/top-up-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pack: packId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not start checkout.");
        return;
      }
      if (typeof data.url !== "string" || !data.url) {
        setError("Checkout did not return a link. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoadingPack(null);
    }
  }, []);

  return (
    <section className="rounded-2xl border border-[#c6a77d]/25 bg-gradient-to-br from-[#c6a77d]/10 via-zinc-950/60 to-zinc-950/80 p-6 shadow-lg shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c6a77d]/90">Top up</p>
          <h3 className="mt-2 text-base font-semibold text-zinc-50">Add more try-ons</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
            Buy extra try-ons anytime as a one-time payment. After checkout completes, the try-ons are added to your
            existing limit on the same API key.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {TOP_UP_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={loadingPack !== null}
            onClick={() => void startCheckout(pack.id)}
            className="inline-flex min-w-[10rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/15 bg-zinc-950/70 px-4 py-3 text-center transition hover:border-[#c6a77d]/40 hover:bg-zinc-900/80 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:items-stretch"
          >
            <span className="text-sm font-semibold text-zinc-100">
              {loadingPack === pack.id ? "Redirecting…" : `${pack.tryOns.toLocaleString()} try-ons`}
            </span>
            <span className="text-xs font-medium text-zinc-500">
              £{(pack.amountGbpPence / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
