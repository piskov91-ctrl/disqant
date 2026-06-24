"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { SubscriptionPlanKey } from "@/lib/subscriptionPlans";
import { SUBSCRIPTION_PLAN_KEYS_ORDERED } from "@/lib/subscriptionPlans";
import {
  computeSubscriptionPlanProfit,
  recommendedProfitMarginPlanKey,
  type SubscriptionPlanProfitRow,
} from "@/lib/subscriptionPlanProfit";
import type { StoredSubscriptionPlanRow } from "@/lib/subscriptionPlanCatalogStore";

type EditablePlanRow = StoredSubscriptionPlanRow & { key: SubscriptionPlanKey };

type CatalogPayload = {
  costPerTryOnGbp: number;
  plans: Record<SubscriptionPlanKey, StoredSubscriptionPlanRow>;
  profitRows?: SubscriptionPlanProfitRow[];
  recommendedPlanKey?: SubscriptionPlanKey | null;
};

function formatGbp(amount: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

function penceFromPoundsInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed.length) return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function poundsInputFromPence(pence: number): string {
  return (pence / 100).toFixed(2);
}

function parsePositiveIntInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed.length) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function SubscriptionCalcPanel() {
  const costInputId = useId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [costPerTryOnGbp, setCostPerTryOnGbp] = useState("");
  const [plans, setPlans] = useState<EditablePlanRow[]>([]);
  const [priceInputs, setPriceInputs] = useState<Record<SubscriptionPlanKey, string>>({
    starter: "",
    boutique: "",
    studio: "",
    premium: "",
  });
  const [tryOnInputs, setTryOnInputs] = useState<Record<SubscriptionPlanKey, string>>({
    starter: "",
    boutique: "",
    studio: "",
    premium: "",
  });

  const applyPayload = useCallback((data: CatalogPayload) => {
    setCostPerTryOnGbp(String(data.costPerTryOnGbp));
    const rows: EditablePlanRow[] = SUBSCRIPTION_PLAN_KEYS_ORDERED.map((key) => ({
      key,
      ...data.plans[key],
    }));
    setPlans(rows);
    const nextPrices = {} as Record<SubscriptionPlanKey, string>;
    const nextTryOns = {} as Record<SubscriptionPlanKey, string>;
    for (const key of SUBSCRIPTION_PLAN_KEYS_ORDERED) {
      nextPrices[key] = poundsInputFromPence(data.plans[key].amountGbpPence);
      nextTryOns[key] = String(data.plans[key].tryOnLimit);
    }
    setPriceInputs(nextPrices);
    setTryOnInputs(nextTryOns);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscription-plans");
      const data = (await res.json()) as CatalogPayload & { error?: string };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to load subscription plans.");
        return;
      }
      applyPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscription plans.");
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  const costPerTryOn = useMemo(() => {
    const n = Number.parseFloat(costPerTryOnGbp.trim());
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [costPerTryOnGbp]);

  const draftPlans = useMemo(() => {
    const out = {} as Record<SubscriptionPlanKey, StoredSubscriptionPlanRow>;
    for (const row of plans) {
      const pricePence = penceFromPoundsInput(priceInputs[row.key]) ?? row.amountGbpPence;
      const tryOns = parsePositiveIntInput(tryOnInputs[row.key]) ?? row.tryOnLimit;
      out[row.key] = {
        name: row.name,
        amountGbpPence: pricePence,
        tryOnLimit: tryOns,
        ...(typeof row.maxTopUpPurchasesPerBillingCycle === "number"
          ? { maxTopUpPurchasesPerBillingCycle: row.maxTopUpPurchasesPerBillingCycle }
          : {}),
      };
    }
    return out;
  }, [plans, priceInputs, tryOnInputs]);

  const profitRows = useMemo(
    () =>
      SUBSCRIPTION_PLAN_KEYS_ORDERED.map((key) =>
        computeSubscriptionPlanProfit(key, draftPlans[key], costPerTryOn),
      ),
    [draftPlans, costPerTryOn],
  );

  const recommendedKey = useMemo(() => recommendedProfitMarginPlanKey(profitRows), [profitRows]);

  function updatePlanName(key: SubscriptionPlanKey, name: string) {
    setPlans((prev) => prev.map((p) => (p.key === key ? { ...p, name } : p)));
    setSaveMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    const costN = Number.parseFloat(costPerTryOnGbp.trim());
    if (!Number.isFinite(costN) || costN < 0) {
      setError("Cost per try-on must be a non-negative number.");
      setSaving(false);
      return;
    }

    const plansPayload = {} as Record<SubscriptionPlanKey, StoredSubscriptionPlanRow>;
    for (const key of SUBSCRIPTION_PLAN_KEYS_ORDERED) {
      const row = plans.find((p) => p.key === key);
      const name = row?.name.trim() ?? "";
      const amountGbpPence = penceFromPoundsInput(priceInputs[key]);
      const tryOnLimit = parsePositiveIntInput(tryOnInputs[key]);
      if (!name.length) {
        setError(`Plan ${key}: name is required.`);
        setSaving(false);
        return;
      }
      if (amountGbpPence === null) {
        setError(`Plan ${key}: enter a valid monthly price.`);
        setSaving(false);
        return;
      }
      if (tryOnLimit === null) {
        setError(`Plan ${key}: enter a valid try-on count.`);
        setSaving(false);
        return;
      }
      plansPayload[key] = {
        name,
        amountGbpPence,
        tryOnLimit,
        ...(typeof row?.maxTopUpPurchasesPerBillingCycle === "number"
          ? { maxTopUpPurchasesPerBillingCycle: row.maxTopUpPurchasesPerBillingCycle }
          : {}),
      };
    }

    try {
      const res = await fetch("/api/admin/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costPerTryOnGbp: costN, plans: plansPayload }),
      });
      const data = (await res.json()) as CatalogPayload & { error?: string; ok?: boolean };
      if (!res.ok) {
        if (data.error === "Unauthorized.") window.location.reload();
        setError(data.error || "Failed to save subscription plans.");
        return;
      }
      applyPayload(data);
      setSaveMessage("Subscription plan prices and try-on limits saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save subscription plans.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 w-full overflow-hidden rounded-2xl border border-[#C6A77D]/20 bg-gradient-to-br from-[#1f1b17]/90 via-zinc-950/80 to-[#14110e]/90 p-6 shadow-lg shadow-black/40 md:p-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C6A77D]/75">Subscription Calc</p>
      <h2 className="mt-2 text-lg font-semibold text-[#F5EDE4]">Plan economics &amp; catalog</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Model revenue, Fashn cost, and net profit per tier. Saving updates live subscription prices and try-on limits
        across checkout, fulfillment, and the public plans page. If Stripe catalog Price IDs are set in env, checkout
        still bills those fixed Stripe prices — clear them to use saved amounts via dynamic checkout.
      </p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {saveMessage ? (
        <div className="mt-6 rounded-xl border border-emerald-800/60 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200">
          {saveMessage}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-zinc-500">Loading subscription catalog…</p>
      ) : (
        <>
          <div className="mt-8 max-w-sm">
            <label htmlFor={costInputId} className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Cost per try-on (Fashn, GBP)
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                £
              </span>
              <input
                id={costInputId}
                type="text"
                inputMode="decimal"
                value={costPerTryOnGbp}
                onChange={(e) => {
                  setCostPerTryOnGbp(e.target.value);
                  setSaveMessage(null);
                }}
                className="w-full rounded-xl border border-[#C6A77D]/25 bg-[#12100d]/90 py-3 pl-8 pr-4 text-sm text-[#F5EDE4] outline-none transition placeholder:text-zinc-600 focus:border-[#C6A77D]/55 focus:ring-1 focus:ring-[#C6A77D]/25"
              />
            </div>
            <p className="mt-2 text-xs text-zinc-600">Default: 2 credits × $0.075 ÷ 1.25 FX ≈ £0.12 per try-on.</p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {profitRows.map((profit) => {
              const featured = profit.key === recommendedKey;
              const planRow = plans.find((p) => p.key === profit.key);
              if (!planRow) return null;

              return (
                <article
                  key={profit.key}
                  className={`relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-[#1a1612] to-[#12100d] p-5 shadow-lg ${
                    featured
                      ? "border-[#C6A77D]/50 shadow-[#C6A77D]/10 ring-1 ring-[#C6A77D]/30"
                      : "border-white/8 shadow-black/30"
                  }`}
                >
                  {featured ? (
                    <span className="absolute right-4 top-4 rounded-full border border-[#C6A77D]/40 bg-[#C6A77D]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e8d4bc]">
                      Best margin
                    </span>
                  ) : null}

                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{profit.key}</p>

                  <label className="mt-3 block text-xs font-medium text-zinc-500">Plan name</label>
                  <input
                    type="text"
                    value={planRow.name}
                    onChange={(e) => updatePlanName(profit.key, e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#F5EDE4] outline-none focus:border-[#C6A77D]/45"
                  />

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-500">Monthly price (£)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={priceInputs[profit.key]}
                        onChange={(e) => {
                          setPriceInputs((prev) => ({ ...prev, [profit.key]: e.target.value }));
                          setSaveMessage(null);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm tabular-nums text-[#F5EDE4] outline-none focus:border-[#C6A77D]/45"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-500">Try-ons / month</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={tryOnInputs[profit.key]}
                        onChange={(e) => {
                          setTryOnInputs((prev) => ({ ...prev, [profit.key]: e.target.value }));
                          setSaveMessage(null);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm tabular-nums text-[#F5EDE4] outline-none focus:border-[#C6A77D]/45"
                      />
                    </div>
                  </div>

                  <dl className="mt-5 space-y-2 border-t border-white/5 pt-4 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-zinc-500">Revenue</dt>
                      <dd className="font-medium tabular-nums text-[#F5EDE4]">{formatGbp(profit.revenueGbp)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-zinc-500">Fashn cost</dt>
                      <dd className="font-medium tabular-nums text-zinc-300">{formatGbp(profit.costGbp)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-zinc-500">Net profit</dt>
                      <dd
                        className={`font-semibold tabular-nums ${
                          profit.netProfitGbp >= 0 ? "text-emerald-400/95" : "text-red-400/95"
                        }`}
                      >
                        {formatGbp(profit.netProfitGbp)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-zinc-500">Margin</dt>
                      <dd className="font-medium tabular-nums text-[#e8d4bc]">{profit.marginPct.toFixed(1)}%</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center justify-center rounded-xl border border-[#C6A77D]/45 bg-[#C6A77D]/10 px-6 py-3 text-sm font-semibold tracking-wide text-[#e8d4bc] shadow-sm shadow-black/30 transition hover:border-[#C6A77D]/70 hover:bg-[#C6A77D]/20 hover:text-[#fdf6ed] disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save plans"}
            </button>
            <p className="text-xs text-zinc-600">
              Redis key: <span className="font-mono text-zinc-500">fit-room:subscriptionPlans:catalog</span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
