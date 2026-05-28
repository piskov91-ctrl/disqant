"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  computeEnterprisePricing,
  computeEnterpriseRecommendedDiscount,
  ENTERPRISE_RECOMMENDED_RATE_TIERS,
  FASHN_USD_PER_CREDIT,
  FASHN_USD_TO_GBP,
  MAX_ENTERPRISE_DISCOUNT_PCT,
  parseEnterpriseDiscountPct,
} from "@/lib/enterprisePriceCalculator";

function formatGbp(amount: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

function formatGbpPerUnit(amount: number): string {
  return `${formatGbp(amount, amount >= 1 ? 2 : 3)}/try-on`;
}

type PriceCardProps = {
  title: string;
  subtitle: string;
  accent: "gold" | "sky" | "amber";
  totalGbp: number;
  profitGbp: number;
  marginPct: number;
  extra?: ReactNode;
  featured?: boolean;
};

const accentRing: Record<PriceCardProps["accent"], string> = {
  gold: "border-[#C6A77D]/45 shadow-[#C6A77D]/10",
  sky: "border-sky-700/50 shadow-sky-950/30",
  amber: "border-amber-700/45 shadow-amber-950/25",
};

const accentTitle: Record<PriceCardProps["accent"], string> = {
  gold: "text-[#e8d4bc]",
  sky: "text-sky-200",
  amber: "text-amber-200/90",
};

function PriceCard({
  title,
  subtitle,
  accent,
  totalGbp,
  profitGbp,
  marginPct,
  extra,
  featured,
}: PriceCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-[#1a1612] to-[#12100d] p-5 shadow-lg ${accentRing[accent]} ${
        featured ? "ring-1 ring-[#C6A77D]/30" : ""
      }`}
    >
      {featured ? (
        <span className="absolute right-4 top-4 rounded-full border border-[#C6A77D]/40 bg-[#C6A77D]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e8d4bc]">
          Recommended
        </span>
      ) : null}
      <h3 className={`text-sm font-semibold uppercase tracking-[0.12em] ${accentTitle[accent]}`}>{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{subtitle}</p>
      {extra ? <div className="mt-3 text-xs text-zinc-400">{extra}</div> : null}
      <p className="mt-5 font-serif text-3xl tracking-tight text-[#F5EDE4]">{formatGbp(totalGbp)}</p>
      <dl className="mt-4 space-y-2 border-t border-white/5 pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-zinc-500">Profit</dt>
          <dd className={`font-medium tabular-nums ${profitGbp >= 0 ? "text-emerald-300/95" : "text-red-300"}`}>
            {formatGbp(profitGbp)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-zinc-500">Margin</dt>
          <dd className="font-medium tabular-nums text-zinc-300">{marginPct.toFixed(1)}%</dd>
        </div>
      </dl>
    </article>
  );
}

export function EnterprisePriceCalculatorPanel() {
  const [rawTryOns, setRawTryOns] = useState("5000");
  const [rawDiscountPct, setRawDiscountPct] = useState("0");

  const breakdown = useMemo(() => {
    const parsed = Number.parseInt(rawTryOns.replace(/,/g, ""), 10);
    return computeEnterprisePricing(parsed);
  }, [rawTryOns]);

  const discountPct = useMemo(() => parseEnterpriseDiscountPct(rawDiscountPct), [rawDiscountPct]);

  const discountResult = useMemo(() => {
    if (!breakdown || discountPct === null) return null;
    return computeEnterpriseRecommendedDiscount(
      breakdown.recommended.totalGbp,
      breakdown.fashnCostGbp,
      discountPct,
    );
  }, [breakdown, discountPct]);

  const inputInvalid = rawTryOns.trim().length > 0 && breakdown === null;
  const discountInvalid = rawDiscountPct.trim().length > 0 && discountPct === null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C6A77D]/80">Enterprise</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Estimate Fashn API cost and quote options from a monthly try-on volume. Credits = try-ons × 2; Fashn cost =
          credits × ${FASHN_USD_PER_CREDIT.toFixed(3)} ÷ {FASHN_USD_TO_GBP}.
        </p>
      </div>

      <div className="max-w-xs">
        <label htmlFor="enterprise-calc-tryons" className="block text-sm font-medium text-[#F5EDE4]/85">
          Number of try-ons
        </label>
        <input
          id="enterprise-calc-tryons"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={rawTryOns}
          onChange={(e) => setRawTryOns(e.target.value.replace(/[^\d,]/g, ""))}
          className="mt-2 w-full rounded-xl border border-[#C6A77D]/25 bg-[#0f0d0b] px-4 py-3 text-lg font-medium tabular-nums text-[#F5EDE4] outline-none transition placeholder:text-zinc-600 focus:border-[#C6A77D]/55 focus:ring-1 focus:ring-[#C6A77D]/25"
          placeholder="e.g. 5000"
        />
        {inputInvalid ? (
          <p className="mt-2 text-xs text-red-300/90">Enter a whole number greater than zero.</p>
        ) : null}
      </div>

      {breakdown ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800/80 bg-black/25 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Credits</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
                {breakdown.credits.toLocaleString("en-GB")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{breakdown.tryOns.toLocaleString("en-GB")} try-ons × 2</p>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-black/25 px-4 py-4 sm:col-span-1 lg:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Fashn cost (GBP)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">
                {formatGbp(breakdown.fashnCostGbp)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {breakdown.credits.toLocaleString("en-GB")} credits × ${FASHN_USD_PER_CREDIT.toFixed(3)} ÷{" "}
                {FASHN_USD_TO_GBP}
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <PriceCard
              featured
              accent="gold"
              title="Recommended"
              subtitle="Tiered rate by volume — primary quote anchor."
              totalGbp={breakdown.recommended.totalGbp}
              profitGbp={breakdown.recommended.profitGbp}
              marginPct={breakdown.recommended.marginPct}
              extra={
                <>
                  <span className="text-zinc-500">Tier </span>
                  {breakdown.recommended.tierLabel}
                  <span className="mx-2 text-zinc-700">·</span>
                  <span className="text-zinc-500">Rate </span>
                  {formatGbpPerUnit(breakdown.recommended.rateGbpPerTryOn)}
                </>
              }
            />
            <PriceCard
              accent="sky"
              title="Mid price"
              subtitle="Fashn cost × 2 — balanced margin."
              totalGbp={breakdown.mid.totalGbp}
              profitGbp={breakdown.mid.profitGbp}
              marginPct={breakdown.mid.marginPct}
            />
            <PriceCard
              accent="amber"
              title="Minimum"
              subtitle="Fashn cost × 1.5 — floor price."
              totalGbp={breakdown.minimum.totalGbp}
              profitGbp={breakdown.minimum.profitGbp}
              marginPct={breakdown.minimum.marginPct}
            />
          </div>

          <div className="rounded-2xl border border-[#C6A77D]/25 bg-gradient-to-br from-[#1a1612]/90 to-[#0f0d0b] p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#e8d4bc]">Discount</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Apply up to {MAX_ENTERPRISE_DISCOUNT_PCT}% off the recommended price.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <label htmlFor="enterprise-calc-discount" className="block text-sm font-medium text-[#F5EDE4]/85">
                  Discount %
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="enterprise-calc-discount"
                    type="range"
                    min={0}
                    max={MAX_ENTERPRISE_DISCOUNT_PCT}
                    step={1}
                    value={discountPct ?? 0}
                    onChange={(e) => setRawDiscountPct(e.target.value)}
                    className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-[#C6A77D]"
                  />
                  <div className="relative w-20 shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rawDiscountPct}
                      onChange={(e) => setRawDiscountPct(e.target.value.replace(/[^\d]/g, ""))}
                      className="w-full rounded-lg border border-[#C6A77D]/25 bg-[#0f0d0b] py-2 pl-3 pr-7 text-right text-sm font-medium tabular-nums text-[#F5EDE4] outline-none focus:border-[#C6A77D]/55"
                      aria-label="Discount percentage"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                      %
                    </span>
                  </div>
                </div>
                {discountInvalid ? (
                  <p className="mt-2 text-xs text-red-300/90">
                    Enter a number from 0 to {MAX_ENTERPRISE_DISCOUNT_PCT}.
                  </p>
                ) : null}
              </div>
            </div>

            {discountResult ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#C6A77D]/20 bg-black/30 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Discounted price</p>
                  <p className="mt-1 font-serif text-2xl tracking-tight text-[#F5EDE4]">
                    {formatGbp(discountResult.discountedPriceGbp)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatGbp(breakdown.recommended.totalGbp)} − {discountResult.discountPct}%
                  </p>
                </div>
                <div className="rounded-xl border border-[#C6A77D]/20 bg-black/30 px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Profit after discount</p>
                  <p
                    className={`mt-1 font-serif text-2xl tracking-tight tabular-nums ${
                      discountResult.profitAfterDiscountGbp >= 0 ? "text-emerald-300/95" : "text-red-300"
                    }`}
                  >
                    {formatGbp(discountResult.profitAfterDiscountGbp)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Margin {discountResult.marginAfterDiscountPct.toFixed(1)}% · Fashn cost{" "}
                    {formatGbp(breakdown.fashnCostGbp)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <details className="rounded-xl border border-zinc-800/70 bg-black/20 px-4 py-3 text-sm text-zinc-400">
            <summary className="cursor-pointer select-none font-medium text-zinc-300">Recommended tier table</summary>
            <table className="mt-4 w-full max-w-md text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Volume</th>
                  <th className="pb-2 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {ENTERPRISE_RECOMMENDED_RATE_TIERS.map((tier) => {
                  const active = breakdown.recommended.tierLabel === tier.label;
                  return (
                    <tr
                      key={tier.label}
                      className={`border-b border-zinc-900/80 ${active ? "text-[#e8d4bc]" : ""}`}
                    >
                      <td className="py-2 pr-4">{tier.label}</td>
                      <td className="py-2 tabular-nums">{formatGbpPerUnit(tier.rateGbp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Enter a try-on volume to see credits, cost, and price options.</p>
      )}
    </div>
  );
}

type EnterprisePriceCalculatorModalProps = {
  open: boolean;
  onClose: () => void;
};

export function EnterprisePriceCalculatorModal({ open, onClose }: EnterprisePriceCalculatorModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        aria-label="Close calculator"
        onClick={onClose}
      />
      <div
        className="relative z-[101] my-auto w-full max-w-5xl rounded-2xl border border-[#C6A77D]/30 bg-gradient-to-br from-[#1f1b17] via-[#14110e] to-[#0c0a08] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#C6A77D]/15 px-5 py-4 md:px-8 md:py-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-[#F5EDE4] md:text-xl">
              Enterprise price calculator
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Internal quoting tool — not visible to merchants.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C6A77D]/35 bg-[#1a1612] text-[#F5EDE4] transition hover:border-[#C6A77D]/60 hover:bg-[#252019]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[min(78vh,900px)] overflow-y-auto px-5 py-6 md:px-8 md:py-8">
          <EnterprisePriceCalculatorPanel />
        </div>
      </div>
    </div>
  );
}
