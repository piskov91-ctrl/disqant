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

export type DashboardTopUpPanelProps = {
  /** Completed Stripe top-up checkouts since the linked key’s last monthly billing reset (each checkout = one). */
  topUpsPurchasedThisBillingCycle: number;
  /** Catalogue cap for linked plan; `null` = unlimited top-up purchases each cycle (e.g. Premium or custom caps). */
  maxTopUpsPurchasesPerBillingCycle: number | null;
};

export function DashboardTopUpPanel({
  topUpsPurchasedThisBillingCycle,
  maxTopUpsPurchasesPerBillingCycle,
}: DashboardTopUpPanelProps) {
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

  const purchaseCap =
    typeof maxTopUpsPurchasesPerBillingCycle === "number" && Number.isFinite(maxTopUpsPurchasesPerBillingCycle)
      ? Math.floor(maxTopUpsPurchasesPerBillingCycle)
      : null;
  const hasCap = purchaseCap !== null;
  const atTopUpPurchaseCap =
    purchaseCap !== null && Math.floor(topUpsPurchasedThisBillingCycle) >= purchaseCap;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#c6a77d]/35 bg-gradient-to-br from-[#c6a77d]/[0.14] via-black/45 to-black/70 p-7 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl md:p-9">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5ead8]/50 to-transparent opacity-80"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f0e6d8]/90">Top up</p>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-zinc-50">Add more try-ons</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            One-time purchases extend your allowance on the same API key immediately after checkout. Top-ups carry forward
            across monthly billing resets until you use them; only your included plan try-ons refresh each cycle.
          </p>
          {hasCap ? (
            <p className="mt-4 max-w-xl rounded-xl border border-[#c6a77d]/25 bg-black/30 px-4 py-3 text-xs leading-relaxed text-zinc-300">
              <span className="font-semibold text-[#e8dcc8]">Plan top-up allowance (this billing cycle)</span>:{" "}
              <span className="tabular-nums">
                {Math.floor(topUpsPurchasedThisBillingCycle).toLocaleString()} used
              </span>{" "}
              of{" "}
              <span className="tabular-nums">{purchaseCap.toLocaleString()}</span> Stripe top-ups
              allowed until your monthly plan resets. Each pack or custom purchase counts once.
              {atTopUpPurchaseCap ? (
                <span className="mt-2 block font-medium text-amber-100/95">
                  You&apos;ve reached your limit — more top-ups are available after the next allowance reset on your billing
                  day.
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-4 max-w-xl rounded-xl border border-emerald-500/22 bg-emerald-950/20 px-4 py-3 text-xs leading-relaxed text-emerald-100/90">
              <span className="font-semibold text-emerald-50/95">Plan top-ups</span>: no per-cycle purchase limit on your
              current tier — you can buy extras whenever you need them.
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-5 text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}

      <div className="relative mt-7 flex flex-wrap gap-4">
        {TOP_UP_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={busy || atTopUpPurchaseCap}
            onClick={() => void startCheckout(pack.id)}
            className="group relative min-w-[10.5rem] flex-1 overflow-hidden rounded-2xl border border-[#c6a77d]/42 bg-gradient-to-b from-[#c6a77d]/22 via-black/40 to-black/60 px-5 py-4 text-center shadow-[inset_0_1px_0_0_rgba(255,236,210,0.16)] transition-all duration-300 hover:border-[#e8d5b5]/60 hover:from-[#c6a77d]/30 hover:shadow-[0_16px_42px_-14px_rgba(198,167,125,0.42)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:items-stretch"
          >
            <span
              className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60"
              aria-hidden
            />
            <span className="relative text-[15px] font-semibold tracking-wide text-[#faf6ef]">
              {loadingKey === pack.id ? "Redirecting…" : `${pack.tryOns.toLocaleString()} try-ons`}
            </span>
            <span className="relative mt-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-[#c6a77d]/95">
              £{(pack.amountGbpPence / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mt-10 border-t border-[#c6a77d]/18 pt-8">
        <p className="text-sm font-semibold text-zinc-100">Custom amount</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Minimum {TOP_UP_CUSTOM_MIN_TRY_ONS.toLocaleString()} try-ons · £
          {(TOP_UP_CUSTOM_PENCE_PER_TRY_ON / 100).toFixed(2)} each · up to{" "}
          {TOP_UP_CUSTOM_MAX_TRY_ONS.toLocaleString()} try-ons
        </p>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Number of try-ons
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={`e.g. ${TOP_UP_CUSTOM_MIN_TRY_ONS}`}
              disabled={busy}
              value={customTryOnsInput}
              onChange={(e) => setCustomTryOnsInput(e.target.value.replace(/\D/g, ""))}
              className="rounded-2xl border border-[#c6a77d]/28 bg-black/50 px-4 py-3 text-sm text-zinc-100 outline-none ring-[#c6a77d]/25 placeholder:text-zinc-600 focus:border-[#c6a77d]/50 focus:ring-2 disabled:opacity-50"
            />
          </label>
          <div className="flex min-w-[10rem] flex-1 flex-col justify-end gap-2 sm:pb-1">
            <p className="text-sm tabular-nums text-zinc-300">
              {customTryOnsInput.trim() === "" ? (
                <span className="text-zinc-600">Enter a quantity to see your total.</span>
              ) : customTryOnsParsed != null ? (
                <>
                  Total:{" "}
                  <span className="font-semibold text-[#f0e6d8]">{customPriceFormatted}</span>
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
            disabled={busy || customTryOnsParsed == null || atTopUpPurchaseCap}
            onClick={() => void startCustomCheckout()}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-[#e8d5b5]/45 bg-gradient-to-b from-[#e8dcc8] via-[#c6a77d] to-[#a68958] px-6 text-sm font-semibold tracking-wide text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_36px_-12px_rgba(198,167,125,0.55)] transition hover:from-[#f5ebe0] hover:via-[#d4bc94] hover:to-[#b89363] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {loadingKey === "custom" ? "Redirecting…" : "Buy custom amount"}
          </button>
        </div>
      </div>
    </section>
  );
}
