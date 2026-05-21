"use client";

import { Activity, Coins, Gauge, ImageOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { TryOnTimingCharts } from "@/components/TryOnTimingCharts";
import { LOCAL_OR_UNKNOWN_PRODUCT } from "@/lib/tryOnConstants";
import { tryOnUsageFillStyle } from "@/lib/tryOnUsageBarStyle";
import { retailerDashboardPlanFromBaseLimit } from "@/lib/subscriptionPlans";
import { DashboardEmailDeveloperPanel } from "./DashboardEmailDeveloperPanel";
import { DashboardInstallPlatformGuide } from "./DashboardInstallPlatformGuide";
import { DashboardInstallPreviewAnimation } from "./DashboardInstallPreviewAnimation";
import { DashboardCancelSubscriptionPanel, type DashboardSubscriptionBillingProps } from "./DashboardCancelSubscriptionPanel";
import { DashboardTopUpPanel } from "./DashboardTopUpPanel";

type DashboardTab = "overview" | "getCode" | "analytics";

function parseDashboardTab(searchParams: Pick<URLSearchParams, "get">): DashboardTab {
  const raw = searchParams.get("tab");
  if (raw === "get-code" || raw === "getCode") return "getCode";
  if (raw === "analytics") return "analytics";
  if (raw === "overview") return "overview";
  return "overview";
}

function searchParamsStringForTab(tab: DashboardTab): string {
  const qs = new URLSearchParams();
  if (tab === "getCode") qs.set("tab", "get-code");
  else if (tab === "analytics") qs.set("tab", "analytics");
  else qs.set("tab", "overview");
  return qs.toString();
}

function DashboardShellSuspenseFallback() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:pt-10">
      <div className="h-12 w-full max-w-lg animate-pulse rounded-full bg-zinc-900/80" />
      <div className="mt-10 h-56 animate-pulse rounded-2xl border border-white/5 bg-zinc-900/40" />
    </div>
  );
}

type ClientUsagePayload = {
  error?: string;
  usageCount?: number;
  usageLimit?: number;
  basePlanLimit?: number;
  planUsageCount?: number;
  planLimit?: number;
  topUpUsageCount?: number;
  topUpLimit?: number;
};

type AnalyticsPayload = {
  tryOnByHourUtc?: number[];
  tryOnByWeekdayUtc?: number[];
  products?: Array<{ productImageUrl: string; displayName: string; tryOnCount: number }>;
  error?: string;
};

function ProductThumb({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const canLoad =
    url !== LOCAL_OR_UNKNOWN_PRODUCT &&
    (url.startsWith("http://") || url.startsWith("https://")) &&
    !failed;

  if (!canLoad) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 text-zinc-500">
        <ImageOff className="h-6 w-6 opacity-60" aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote retailer catalog URLs
    <img
      src={url}
      alt=""
      className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export type RetailerPlanSummary = {
  planName: string;
  monthlyTryOnLimit: number;
  /** GBP formatted (e.g. £149.00); null for custom / unknown pricing. */
  monthlyPriceLabel: string | null;
  /** Long formatted UTC calendar date for next allowance reset. */
  nextResetLabel: string;
  /** Resolved billing anchor 1–31 (UTC day-of-month). */
  billingAnchorDayUtc: number;
};

export type RetailerDashboardShellProps = {
  welcomeHeading: string;
  accountSubtitle: string;
  websiteUrl: string | null;
  planSummary: RetailerPlanSummary;
  subscriptionBilling: DashboardSubscriptionBillingProps;
  apiKey: string;
  /** Subscription bucket usage (`usageCount`). */
  initialPlanUsed: number;
  /** Monthly plan cap (`basePlanLimit`). */
  initialBasePlanLimit: number;
  initialTopUpUsed: number;
  initialTopUpLimit: number;
};

function utcCalendarDayOrdinal(day: number): string {
  const d = Math.floor(day);
  if (d < 1 || d > 31) return String(day);
  const mod10 = d % 10;
  const mod100 = d % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${d}${suffix}`;
}

const tabBase =
  "rounded-full px-5 py-2.5 text-sm font-semibold tracking-[0.08em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a77d]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 motion-reduce:transition-none";
const tabInactive =
  "border border-transparent bg-transparent text-zinc-500 hover:border-[#c6a77d]/40 hover:bg-[#c6a77d]/[0.1] hover:text-[#e8dcc8] hover:shadow-[0_0_20px_-8px_rgba(198,167,125,0.35)]";
const tabActive =
  "border border-[#c6a77d]/55 bg-[#c6a77d]/[0.14] text-[#f5efe6] shadow-[inset_0_1px_0_0_rgba(255,236,210,0.22),0_8px_28px_-12px_rgba(198,167,125,0.25)] ring-1 ring-[#c6a77d]/30";

export function RetailerDashboardShell(props: RetailerDashboardShellProps) {
  return (
    <Suspense fallback={<DashboardShellSuspenseFallback />}>
      <RetailerDashboardShellInner {...props} />
    </Suspense>
  );
}

function RetailerDashboardShellInner({
  welcomeHeading,
  accountSubtitle,
  websiteUrl,
  planSummary,
  subscriptionBilling,
  apiKey,
  initialPlanUsed,
  initialBasePlanLimit,
  initialTopUpUsed,
  initialTopUpLimit,
}: RetailerDashboardShellProps) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<DashboardTab>(() => parseDashboardTab(searchParams));

  /** Next.js links / full navigations update search params; keep tab in sync. */
  useEffect(() => {
    setTab(parseDashboardTab(searchParams));
  }, [searchParams]);

  /** Browser back/forward after in-place URL updates. */
  useEffect(() => {
    function onPopState() {
      setTab(parseDashboardTab(new URLSearchParams(window.location.search)));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /** Tab switches stay on this page: update React state + URL via history API only (no App Router navigation). */
  const selectTab = useCallback((next: DashboardTab) => {
    setTab(next);
    window.history.replaceState(null, "", "/dashboard?" + searchParamsStringForTab(next));
  }, []);

  const [planUsed, setPlanUsed] = useState(initialPlanUsed);
  const [basePlanLimit, setBasePlanLimit] = useState(initialBasePlanLimit);
  const [topUpUsed, setTopUpUsed] = useState(initialTopUpUsed);
  const [topUpLimit, setTopUpLimit] = useState(initialTopUpLimit);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  const derivedPlan = useMemo(() => retailerDashboardPlanFromBaseLimit(basePlanLimit), [basePlanLimit]);
  const derivedMonthlyPriceLabel = useMemo(() => {
    if (derivedPlan.priceGbpPence == null) return null;
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
      derivedPlan.priceGbpPence / 100,
    );
  }, [derivedPlan.priceGbpPence]);

  /** Anchor day + next reset from server; tier/limit/price follow live `basePlanLimit` after refresh. */
  const displayPlanSummary = useMemo(
    () => ({
      ...planSummary,
      planName: derivedPlan.planName,
      monthlyTryOnLimit: derivedPlan.monthlyTryOnLimit,
      monthlyPriceLabel: derivedMonthlyPriceLabel,
    }),
    [planSummary, derivedPlan.planName, derivedPlan.monthlyTryOnLimit, derivedMonthlyPriceLabel],
  );

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const snippet = useMemo(() => {
    if (!origin || !apiKey) return "";
    return `<script async src="${origin}/widget.js" data-fit-room-key="${apiKey}"></script>`;
  }, [origin, apiKey]);

  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const copySnippet = useCallback(async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSnippet(true);
      window.setTimeout(() => setCopiedSnippet(false), 2200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = snippet;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedSnippet(true);
      window.setTimeout(() => setCopiedSnippet(false), 2200);
    }
  }, [snippet]);

  const refreshUsage = useCallback(async () => {
    setUsageError(null);
    setUsageLoading(true);
    try {
      const res = await fetch("/api/retailer/client-usage", { method: "GET", credentials: "include" });
      const data = (await res.json()) as ClientUsagePayload;
      if (!res.ok) {
        setUsageError(data.error || "Could not load try-on usage.");
        return;
      }
      const base =
        typeof data.basePlanLimit === "number"
          ? data.basePlanLimit
          : typeof data.planLimit === "number"
            ? data.planLimit
            : NaN;
      if (
        typeof data.planUsageCount === "number" &&
        Number.isFinite(base) &&
        typeof data.topUpUsageCount === "number" &&
        typeof data.topUpLimit === "number"
      ) {
        setPlanUsed(data.planUsageCount);
        setBasePlanLimit(base);
        setTopUpUsed(data.topUpUsageCount);
        setTopUpLimit(data.topUpLimit);
      }
    } catch {
      setUsageError("Something went wrong. Please try again.");
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("topup") !== "success") return;
    void refreshUsage();
    sp.delete("topup");
    const q = sp.toString();
    const nextUrl = `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [refreshUsage]);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage]);

  const totalUsed = useMemo(() => planUsed + topUpUsed, [planUsed, topUpUsed]);
  const totalLimit = useMemo(() => basePlanLimit + topUpLimit, [basePlanLimit, topUpLimit]);

  const remaining = useMemo(() => Math.max(0, totalLimit - totalUsed), [totalLimit, totalUsed]);
  const totalPct = useMemo(
    () => (totalLimit > 0 ? Math.min(100, Math.round((totalUsed / totalLimit) * 100)) : 0),
    [totalUsed, totalLimit],
  );
  const planPct = useMemo(
    () =>
      basePlanLimit > 0 ? Math.min(100, Math.round((planUsed / basePlanLimit) * 100)) : 0,
    [planUsed, basePlanLimit],
  );
  const topUpPct = useMemo(
    () =>
      topUpLimit > 0 ? Math.min(100, Math.round((topUpUsed / topUpLimit) * 100)) : 0,
    [topUpUsed, topUpLimit],
  );
  const blocked = totalLimit > 0 && totalUsed >= totalLimit;

  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetch("/api/retailer/analytics/insights", { credentials: "include" });
      const json = (await res.json()) as AnalyticsPayload;
      if (!res.ok) {
        setAnalytics(null);
        setAnalyticsError(json.error || "Could not load analytics.");
        return;
      }
      setAnalytics({
        tryOnByHourUtc: Array.isArray(json.tryOnByHourUtc) ? json.tryOnByHourUtc : [],
        tryOnByWeekdayUtc: Array.isArray(json.tryOnByWeekdayUtc) ? json.tryOnByWeekdayUtc : [],
        products: Array.isArray(json.products) ? json.products : [],
      });
    } catch (e) {
      setAnalytics(null);
      setAnalyticsError(e instanceof Error ? e.message : "Could not load analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "analytics") return;
    void loadAnalytics();
  }, [tab, loadAnalytics]);

  const hourArr = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) =>
        typeof analytics?.tryOnByHourUtc?.[i] === "number" && Number.isFinite(analytics.tryOnByHourUtc[i])
          ? analytics.tryOnByHourUtc[i]
          : 0,
      ),
    [analytics],
  );

  const weekdayArr = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        typeof analytics?.tryOnByWeekdayUtc?.[i] === "number" && Number.isFinite(analytics.tryOnByWeekdayUtc[i])
          ? analytics.tryOnByWeekdayUtc[i]
          : 0,
      ),
    [analytics],
  );

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0 -z-10 min-h-full bg-[radial-gradient(ellipse_95%_45%_at_50%_0%,rgba(198,167,125,0.07),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(0,0,0,0.35),transparent_50%),radial-gradient(ellipse_55%_45%_at_0%_85%,rgba(198,167,125,0.04),transparent_48%)]"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:pt-10">
        <div
          className="inline-flex flex-wrap gap-1.5 rounded-full border border-[#c6a77d]/38 bg-black/60 p-1.5 shadow-[inset_0_1px_0_0_rgba(255,236,210,0.08)] backdrop-blur-md"
          role="tablist"
          aria-label="Dashboard sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "overview"}
            onClick={() => {
              setTab("overview");
              window.history.replaceState(null, "", "/dashboard?" + searchParamsStringForTab("overview"));
            }}
            className={`${tabBase} ${tab === "overview" ? tabActive : tabInactive}`}
          >
            My Plan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "getCode"}
            onClick={() => selectTab("getCode")}
            className={`${tabBase} ${tab === "getCode" ? tabActive : tabInactive}`}
          >
            Get Code
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "analytics"}
            onClick={() => selectTab("analytics")}
            className={`${tabBase} ${tab === "analytics" ? tabActive : tabInactive}`}
          >
            Analytics
          </button>
        </div>

        {tab === "overview" ? (
          <div className="mt-10 space-y-10 md:space-y-14">
            <header className="relative overflow-hidden rounded-3xl border border-[#c6a77d]/35 bg-black/38 p-8 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.82)] backdrop-blur-xl md:p-11">
              <div
                className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#c6a77d]/14 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#c6a77d]/10 blur-3xl"
                aria-hidden
              />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d4bc94]/85">
                  Dashboard
                </p>
                <p className="mt-4 text-balance text-2xl font-semibold tracking-tight text-zinc-50 md:text-[2rem] md:leading-snug">
                  {welcomeHeading}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">{accountSubtitle}</p>
                <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
                  <span className="text-zinc-600">Website</span>
                  <span className="text-zinc-600">·</span>
                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#d4bc94] underline decoration-[#c6a77d]/35 underline-offset-[3px] transition hover:text-[#f0e6d8] hover:decoration-[#c6a77d]/70"
                    >
                      {websiteUrl}
                    </a>
                  ) : (
                    <span className="text-zinc-600">Not provided</span>
                  )}
                  <span className="text-zinc-600">·</span>
                  <Link
                    href="/profile"
                    className="font-medium text-zinc-400 underline-offset-[3px] transition hover:text-[#e8dcc8] hover:underline"
                  >
                    Edit profile
                  </Link>
                </p>
              </div>
            </header>

            <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-12">
              <aside className="lg:col-span-4">
                <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#c6a77d]/28 bg-gradient-to-b from-black/45 via-black/35 to-black/25 p-7 shadow-[inset_0_1px_0_0_rgba(255,236,210,0.08)] backdrop-blur-xl md:p-8">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c6a77d]/65 to-transparent"
                    aria-hidden
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#d4bc94]/88">
                    Your plan
                  </p>
                  <p className="mt-5 text-2xl font-semibold tracking-tight text-zinc-50">{displayPlanSummary.planName}</p>

                  <dl className="mt-8 space-y-6 border-t border-[#c6a77d]/15 pt-8">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Monthly try-on limit
                      </dt>
                      <dd className="mt-2 tabular-nums text-lg font-medium text-[#f0ebe3]">
                        {displayPlanSummary.monthlyTryOnLimit > 0
                          ? `${displayPlanSummary.monthlyTryOnLimit.toLocaleString()} try-ons / month`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Price
                      </dt>
                      <dd className="mt-2 text-lg font-medium text-[#f0ebe3]">
                        {displayPlanSummary.monthlyPriceLabel ? (
                          <>
                            {displayPlanSummary.monthlyPriceLabel}
                            <span className="text-base font-normal text-zinc-500"> / month</span>
                          </>
                        ) : (
                          <>
                            <span className="text-zinc-400">—</span>
                            <p className="mt-1.5 text-xs font-normal leading-relaxed text-zinc-600">
                              Standard tiers show published pricing. Custom plans follow your agreement.
                            </p>
                          </>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Next allowance reset
                      </dt>
                      <dd className="mt-2 text-base font-medium leading-snug text-[#e8dcc8]">
                        {displayPlanSummary.nextResetLabel}
                      </dd>
                      <dd className="mt-3 text-xs leading-relaxed text-zinc-600">
                        Cycle anchored to the{" "}
                        <span className="font-medium text-zinc-500">
                          {utcCalendarDayOrdinal(displayPlanSummary.billingAnchorDayUtc)}
                        </span>{" "}
                        of each month (UTC). Shorter months use the last calendar day when needed. Your{" "}
                        <span className="font-medium text-zinc-500">included plan try-ons</span> refresh on this schedule;
                        purchased top-ups carry forward until fully used.
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-8 flex-1 text-sm leading-relaxed text-zinc-500">
                    Upgrade or change tier anytime—your monthly bucket and billing follow the plan you select.
                  </p>
                  <Link
                    href="/subscriptions"
                    className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-[#c6a77d]/45 bg-[#c6a77d]/12 px-5 py-2.5 text-sm font-semibold text-[#f0e6d8] shadow-sm transition hover:border-[#d4bc94]/55 hover:bg-[#c6a77d]/22"
                  >
                    View plans
                  </Link>

                  <DashboardCancelSubscriptionPanel {...subscriptionBilling} />
                </div>
              </aside>

              <div className="space-y-10 lg:col-span-8">
                <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#c6a77d]/15 pb-8">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#d4bc94]/85">
                      Usage
                    </p>
                    <h2 className="text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">Try-on allowance</h2>
                    <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
                      Every completed Wear Me session on your storefront draws from this pool—plan plus any top-ups.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={usageLoading}
                      onClick={() => void refreshUsage()}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#c6a77d]/35 bg-black/40 px-5 text-sm font-semibold tracking-wide text-[#e8dcc8] shadow-sm backdrop-blur-sm transition hover:border-[#c6a77d]/55 hover:bg-[#c6a77d]/12 disabled:opacity-45"
                    >
                      {usageLoading ? "Refreshing…" : "Refresh"}
                    </button>
                    <span
                      className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                        blocked
                          ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                          : "border-emerald-400/35 bg-emerald-500/12 text-emerald-100"
                      }`}
                    >
                      {blocked ? "Limit reached" : "Active"}
                    </span>
                  </div>
                </div>

                {usageError ? (
                  <p className="text-sm text-red-300/90" role="alert">
                    {usageError}
                  </p>
                ) : null}

                <div className="rounded-3xl border border-[#c6a77d]/22 bg-black/32 p-6 shadow-inner shadow-black/50 backdrop-blur-xl md:p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-300">Overall consumption</p>
                    <p className="tabular-nums text-sm font-semibold text-[#d4bc94]">
                      {totalUsed.toLocaleString()} / {totalLimit.toLocaleString()}{" "}
                      <span className="font-normal text-zinc-500">({totalPct}%)</span>
                    </p>
                  </div>
                  <div className="relative mt-4 h-4 w-full overflow-hidden rounded-full border border-white/[0.14] bg-black/55 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)] ring-1 ring-[#c6a77d]/12">
                    <div
                      className="relative h-full min-w-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
                      style={tryOnUsageFillStyle(totalPct)}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-600">
                    Bar tint moves from green toward amber and red as you approach your cap—same scale as the breakdown
                    below.
                  </p>
                </div>

                <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
                  {(
                    [
                      {
                        label: "Try-ons used",
                        value: totalUsed,
                        hint: "Sessions completed",
                        Icon: Activity,
                      },
                      {
                        label: "Remaining",
                        value: remaining,
                        hint: "Still available",
                        Icon: Coins,
                      },
                      {
                        label: "Total limit",
                        value: totalLimit,
                        hint: "Plan + top-ups",
                        Icon: Gauge,
                      },
                    ] as const
                  ).map(({ label, value, hint, Icon }) => (
                    <div
                      key={label}
                      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#c6a77d]/30 bg-gradient-to-b from-black/52 via-black/38 to-black/[0.28] p-7 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl transition hover:border-[#c6a77d]/42 md:p-8"
                    >
                      <div
                        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#c6a77d]/75 to-transparent opacity-90"
                        aria-hidden
                      />
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/82">
                          {label}
                        </p>
                        <Icon
                          className="h-[22px] w-[22px] shrink-0 text-[#c6a77d]/50 transition group-hover:text-[#c6a77d]/85"
                          strokeWidth={1.35}
                          aria-hidden
                        />
                      </div>
                      <p className="mt-6 text-4xl font-light tabular-nums tracking-tight text-zinc-50 md:text-[2.65rem] md:leading-none">
                        {typeof value === "number" ? value.toLocaleString() : "—"}
                      </p>
                      <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-600">{hint}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-8 rounded-3xl border border-[#c6a77d]/20 bg-black/28 p-6 shadow-inner shadow-black/45 backdrop-blur-xl md:p-8">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-200">Monthly plan bucket</span>
                      <span className="tabular-nums text-sm text-zinc-500">
                        {planUsed.toLocaleString()} / {basePlanLimit.toLocaleString()}{" "}
                        <span className="font-semibold text-[#c6a77d]/90">({planPct}%)</span>
                      </span>
                    </div>
                    <div className="relative mt-3 h-3.5 w-full overflow-hidden rounded-full border border-white/[0.12] bg-black/55 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)] ring-1 ring-[#c6a77d]/10">
                      <div
                        className="relative h-full min-w-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
                        style={tryOnUsageFillStyle(planPct)}
                      />
                    </div>
                  </div>
                  {topUpLimit > 0 ? (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-200">Top-up bucket</span>
                        <span className="tabular-nums text-sm text-zinc-500">
                          {topUpUsed.toLocaleString()} / {topUpLimit.toLocaleString()}{" "}
                          <span className="font-semibold text-[#c6a77d]/90">({topUpPct}%)</span>
                        </span>
                      </div>
                      <div className="relative mt-3 h-3.5 w-full overflow-hidden rounded-full border border-white/[0.12] bg-black/55 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)] ring-1 ring-[#c6a77d]/10">
                        <div
                          className="relative h-full min-w-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-[width] duration-700 ease-out motion-reduce:transition-none"
                          style={tryOnUsageFillStyle(topUpPct)}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600">
                      No top-up bucket yet—add try-ons below whenever you need extra capacity beyond your plan.
                    </p>
                  )}
                </div>

                <DashboardTopUpPanel />
              </div>
            </div>
          </div>
        ) : null}

        {tab === "getCode" ? (
          <div className="mt-10 max-w-4xl space-y-10">
            <div>
              <h2 className="text-lg font-semibold text-zinc-50">Your Wear Me embed code</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Copy this single line and add it to your website. It loads the try-on experience for your shoppers—no
                coding knowledge required after you paste it in the right place.
              </p>
            </div>

            <div className="rounded-xl border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm font-bold leading-relaxed text-red-100">
              Keep this code private — it is unique to your store. Do not share it publicly or post it on social media.
              Only give it to your trusted web developer to install on your website.
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-1 shadow-lg shadow-black/20 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-zinc-950/70 px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Widget script</span>
                <button
                  type="button"
                  disabled={!snippet}
                  onClick={() => void copySnippet()}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#c6a77d] px-5 text-sm font-semibold text-zinc-950 transition hover:bg-[#d4b896] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {copiedSnippet ? "Copied!" : "Copy code"}
                </button>
              </div>
              <pre className="max-h-[200px] overflow-auto p-4 font-mono text-[13px] leading-relaxed text-zinc-200">
                {snippet || "Loading your embed code…"}
              </pre>
            </div>

            <DashboardEmailDeveloperPanel />

            <DashboardInstallPreviewAnimation />

            <DashboardInstallPlatformGuide />
          </div>
        ) : null}

        {tab === "analytics" ? (
          <div className="mt-10 space-y-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-50">Usage analytics</h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-400">
                  When shoppers complete try-ons on your store. Times are shown in UTC (not your local clock).
                </p>
              </div>
              <button
                type="button"
                disabled={analyticsLoading}
                onClick={() => void loadAnalytics()}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-zinc-950/50 px-4 text-sm font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-zinc-900/80 disabled:opacity-50"
              >
                {analyticsLoading ? "Loading…" : "Refresh data"}
              </button>
            </div>

            {analyticsLoading && !analytics ? (
              <p className="text-sm text-zinc-500">Loading charts…</p>
            ) : analyticsError ? (
              <p className="text-sm text-red-300/90">{analyticsError}</p>
            ) : analytics ? (
              <>
                <TryOnTimingCharts
                  variant="dashboard"
                  subtitle="Your store’s completed try-ons, all time."
                  tryOnByHourUtc={hourArr}
                  tryOnByWeekdayUtc={weekdayArr}
                />

                <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm">
                  <h3 className="text-base font-semibold text-zinc-100">Products tried on</h3>
                  <p className="mt-1 text-sm text-zinc-500">Sorted by how often each product image was used in a try-on.</p>
                  {analytics.products && analytics.products.length > 0 ? (
                    <ul className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10 bg-zinc-950/40">
                      {analytics.products.map((p) => (
                        <li key={p.productImageUrl} className="flex items-center gap-4 px-4 py-3">
                          <ProductThumb url={p.productImageUrl} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-100">{p.displayName}</p>
                            {p.productImageUrl !== LOCAL_OR_UNKNOWN_PRODUCT ? (
                              <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">{p.productImageUrl}</p>
                            ) : null}
                          </div>
                          <p className="shrink-0 tabular-nums text-sm font-semibold text-zinc-200">
                            {p.tryOnCount.toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-6 text-sm text-zinc-500">No product-level data yet. Try-ons will appear here after shoppers use Wear Me.</p>
                  )}
                </section>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
