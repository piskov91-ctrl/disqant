"use client";

import { useCallback, useMemo, useState } from "react";
import type { TopUpPackId } from "@/lib/topUpPacks";
import {
  TOP_UP_CUSTOM_MAX_TRY_ONS,
  TOP_UP_CUSTOM_MIN_TRY_ONS,
  TOP_UP_CUSTOM_PENCE_PER_TRY_ON,
  TOP_UP_PACKS,
  customTopUpAmountGbpPence,
  parseCustomTopUpTryOns,
} from "@/lib/topUpPacks";

type CheckoutLoadingKey = TopUpPackId | "custom";

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export function DashboardTopUpPanel() {
  const [loadingKey, setLoadingKey] = useState<CheckoutLoadingKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customTryOnsInput, setCustomTryOnsInput] = useState("");

  const customTryOnsParsed = useMemo(() => {
    const t = customTryOnsInput.trim();
    if (!t) return null;
    return parseCustomTopUpTryOns(Number.parseInt(t, 10));
  }, [customTryOnsInput]);

  const customPriceFormatted = useMemo(() => {
    if (customTryOnsParsed == null) return null;
    const pence = customTopUpAmountGbpPence(customTryOnsParsed);
    return gbpFormatter.format(pence / 100);
  }, [customTryOnsParsed]);

  const startCheckout = useCallback(async (packId: TopUpPackId) => {
    setError(null);
    setLoadingKey(packId);
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
      setLoadingKey(null);
    }
  }, []);

  const startCustomCheckout = useCallback(async () => {
    if (customTryOnsParsed == null) return;
    setError(null);
    setLoadingKey("custom");
    try {
      const res = await fetch("/api/stripe/top-up-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customTryOns: customTryOnsParsed }),
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
      setLoadingKey(null);
    }
  }, [customTryOnsParsed]);

  const busy = loadingKey !== null;

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
            disabled={busy}
            onClick={() => void startCheckout(pack.id)}
            className="inline-flex min-w-[10rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/15 bg-zinc-950/70 px-4 py-3 text-center transition hover:border-[#c6a77d]/40 hover:bg-zinc-900/80 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:items-stretch"
          >
            <span className="text-sm font-semibold text-zinc-100">
              {loadingKey === pack.id ? "Redirecting…" : `${pack.tryOns.toLocaleString()} try-ons`}
            </span>
            <span className="text-xs font-medium text-zinc-500">
              £{(pack.amountGbpPence / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 border-t border-white/10 pt-6">
        <p className="text-sm font-semibold text-zinc-200">Custom amount</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Minimum {TOP_UP_CUSTOM_MIN_TRY_ONS.toLocaleString()} try-ons · £
          {(TOP_UP_CUSTOM_PENCE_PER_TRY_ON / 100).toFixed(2)} each · up to{" "}
          {TOP_UP_CUSTOM_MAX_TRY_ONS.toLocaleString()} try-ons
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-zinc-400">Number of try-ons</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={`e.g. ${TOP_UP_CUSTOM_MIN_TRY_ONS}`}
              disabled={busy}
              value={customTryOnsInput}
              onChange={(e) => setCustomTryOnsInput(e.target.value.replace(/\D/g, ""))}
              className="rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-[#c6a77d]/30 placeholder:text-zinc-600 focus:border-[#c6a77d]/40 focus:ring-2 disabled:opacity-50"
            />
          </label>
          <div className="flex min-w-[10rem] flex-1 flex-col justify-end gap-2 sm:pb-0.5">
            <p className="text-sm tabular-nums text-zinc-300">
              {customTryOnsInput.trim() === "" ? (
                <span className="text-zinc-500">Enter a quantity to see your total.</span>
              ) : customTryOnsParsed != null ? (
                <>
                  Total:{" "}
                  <span className="font-semibold text-[#c6a77d]">{customPriceFormatted}</span>
                </>
              ) : (
                <span className="text-amber-200/90">
                  Enter between {TOP_UP_CUSTOM_MIN_TRY_ONS.toLocaleString()} and{" "}
                  {TOP_UP_CUSTOM_MAX_TRY_ONS.toLocaleString()} try-ons.
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={busy || customTryOnsParsed == null}
            onClick={() => void startCustomCheckout()}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[#c6a77d]/45 bg-[#c6a77d]/15 px-5 text-sm font-semibold text-[#e8d5b5] transition hover:border-[#c6a77d]/60 hover:bg-[#c6a77d]/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loadingKey === "custom" ? "Redirecting…" : "Buy Custom Amount"}
          </button>
        </div>
      </div>
    </section>
  );
}
