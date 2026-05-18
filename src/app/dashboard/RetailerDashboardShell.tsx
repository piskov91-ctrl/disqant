"use client";

import { ImageOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TryOnTimingCharts } from "@/components/TryOnTimingCharts";
import { LOCAL_OR_UNKNOWN_PRODUCT } from "@/lib/tryOnConstants";
import { DashboardInstallPreviewAnimation } from "./DashboardInstallPreviewAnimation";

type DashboardTab = "overview" | "getCode" | "analytics";

type ClientUsagePayload = {
  error?: string;
  usageCount?: number;
  usageLimit?: number;
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

/** Decorative install-guide diagrams (Get Code tab). */
function InstallDiagramStep1CopyCode() {
  return (
    <figure
      className="mt-4 max-w-xl overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      aria-label="Illustration: a code box with a typing cursor"
    >
      <figcaption className="sr-only">Code snippet with cursor</figcaption>
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-950/50 px-3 py-2">
        <div className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Embed snippet</span>
      </div>
      <div className="relative p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
        <div className="flex flex-wrap items-center gap-x-0.5">
          <span className="text-[#c6a77d]/80">&lt;script</span>
          <span className="text-zinc-500"> async </span>
          <span className="text-[#c6a77d]/80">src=</span>
          <span className="text-emerald-400/70">&quot;…/widget.js&quot;</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-0.5">
          <span className="text-[#c6a77d]/80">data-fit-room-key=</span>
          <span className="text-emerald-400/70">&quot;••••••••&quot;</span>
          <span className="text-[#c6a77d]/80">&gt;&lt;/script&gt;</span>
          <span
            className="ml-0.5 inline-block h-3.5 w-px bg-[#c6a77d] motion-safe:animate-pulse"
            aria-hidden
          />
        </div>
      </div>
    </figure>
  );
}

function InstallDiagramStep2Editors() {
  return (
    <figure
      className="mt-4 max-w-xl overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      aria-label="Illustration: browser window with Shopify and WordPress"
    >
      <figcaption className="sr-only">Browser window and popular site builders</figcaption>
      <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-950/50 px-3 py-2">
        <div className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-2 py-1.5">
          <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="6" cy="6" r="0.75" fill="currentColor" />
            <circle cx="8.5" cy="6" r="0.75" fill="currentColor" />
          </svg>
          <span className="truncate text-[10px] text-zinc-500">yoursite.com · theme editor</span>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-8">
        <div
          className="flex h-14 w-[88%] max-w-sm items-center justify-center rounded-lg border border-white/10 bg-zinc-950/60"
          aria-hidden
        >
          <div className="h-8 w-[85%] rounded border border-dashed border-white/15 bg-zinc-900/40" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#95BF47]/15 px-4 py-2.5 shadow-sm shadow-black/20">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#95BF47] text-[10px] font-bold text-white shadow-inner"
              aria-hidden
            >
              S
            </span>
            <span className="text-xs font-semibold tracking-tight text-zinc-200">Shopify</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#21759B]/15 px-4 py-2.5 shadow-sm shadow-black/20">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#21759B] text-xs font-bold text-white shadow-inner"
              aria-hidden
            >
              W
            </span>
            <span className="text-xs font-semibold tracking-tight text-zinc-200">WordPress</span>
          </div>
        </div>
        <p className="text-center text-[10px] uppercase tracking-wider text-zinc-600">Also works with other site builders</p>
      </div>
    </figure>
  );
}

function InstallDiagramStep3BodyTag() {
  return (
    <figure
      className="mt-4 max-w-xl overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      aria-label="Illustration: HTML with closing body tag highlighted"
    >
      <figcaption className="sr-only">Paste embed before closing body tag</figcaption>
      <div className="border-b border-white/10 bg-zinc-950/50 px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">theme.liquid / footer</span>
      </div>
      <div className="p-4 font-mono text-[11px] leading-7 text-zinc-500">
        <div>
          <span className="text-zinc-600">&lt;html&gt;</span>
        </div>
        <div>
          <span className="text-zinc-600">&nbsp;&nbsp;&lt;head&gt;</span>
          <span className="text-zinc-700"> … </span>
          <span className="text-zinc-600">&lt;/head&gt;</span>
        </div>
        <div>
          <span className="text-zinc-600">&nbsp;&nbsp;&lt;body&gt;</span>
        </div>
        <div className="pl-4 text-emerald-400/50">
          <span>&lt;script </span>
          <span className="text-emerald-400/35">… your Wear Me line …</span>
          <span>&gt;&lt;/script&gt;</span>
        </div>
        <div className="pl-4">
          <span className="inline-block rounded-md bg-[#c6a77d]/20 px-2 py-0.5 font-semibold text-[#e8d4b5] ring-1 ring-[#c6a77d]/45">
            &lt;/body&gt;
          </span>
          <span className="ml-2 text-[10px] font-sans font-medium uppercase tracking-wide text-[#c6a77d]/70">
            ← paste above this
          </span>
        </div>
        <div>
          <span className="text-zinc-600">&lt;/html&gt;</span>
        </div>
      </div>
    </figure>
  );
}

function InstallDiagramStep4Success() {
  return (
    <figure
      className="mt-4 flex max-w-xl flex-col items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 px-6 py-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
      aria-label="Illustration: success"
    >
      <figcaption className="sr-only">Published successfully</figcaption>
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-500/[0.12] shadow-[0_0_40px_rgba(52,211,153,0.12)]"
        aria-hidden
      >
        <div className="absolute inset-3 rounded-full border border-emerald-400/20" />
        <svg className="relative h-11 w-11 text-emerald-300" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 12.5 10.2 17 18 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-5 text-sm font-medium text-zinc-300">Live on your site</p>
      <p className="mt-1 text-xs text-zinc-500">Save, publish, then check a product page</p>
    </figure>
  );
}

export type RetailerDashboardShellProps = {
  welcomeHeading: string;
  accountSubtitle: string;
  websiteUrl: string | null;
  planLabel: string;
  apiKey: string;
  initialUsed: number;
  initialLimit: number;
};

const tabBase =
  "rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a77d]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
const tabInactive = "text-zinc-500 hover:text-zinc-300";
const tabActive = "bg-white/[0.07] text-zinc-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";

export function RetailerDashboardShell({
  welcomeHeading,
  accountSubtitle,
  websiteUrl,
  planLabel,
  apiKey,
  initialUsed,
  initialLimit,
}: RetailerDashboardShellProps) {
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [used, setUsed] = useState(initialUsed);
  const [limit, setLimit] = useState(initialLimit);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

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
      if (typeof data.usageCount === "number" && typeof data.usageLimit === "number") {
        setUsed(data.usageCount);
        setLimit(data.usageLimit);
      }
    } catch {
      setUsageError("Something went wrong. Please try again.");
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage]);

  const remaining = useMemo(() => Math.max(0, limit - used), [limit, used]);
  const pct = useMemo(
    () => (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0),
    [used, limit],
  );
  const blocked = limit > 0 && used >= limit;

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
        className="pointer-events-none absolute inset-0 -z-10 min-h-full bg-[radial-gradient(ellipse_100%_55%_at_50%_-10%,rgba(198,167,125,0.09),transparent_52%),radial-gradient(ellipse_70%_45%_at_100%_30%,rgba(124,58,237,0.07),transparent_50%),radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(236,72,153,0.05),transparent_45%)]"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:pt-10">
        <div
          className="inline-flex flex-wrap gap-1 rounded-full border border-white/10 bg-zinc-950/60 p-1 shadow-inner shadow-black/40 backdrop-blur-md"
          role="tablist"
          aria-label="Dashboard sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "overview"}
            onClick={() => setTab("overview")}
            className={`${tabBase} ${tab === "overview" ? tabActive : tabInactive}`}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "getCode"}
            onClick={() => setTab("getCode")}
            className={`${tabBase} ${tab === "getCode" ? tabActive : tabInactive}`}
          >
            Get Code
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "analytics"}
            onClick={() => setTab("analytics")}
            className={`${tabBase} ${tab === "analytics" ? tabActive : tabInactive}`}
          >
            Analytics
          </button>
        </div>

        {tab === "overview" ? (
          <div className="mt-10 space-y-8">
            <header className="rounded-2xl border border-white/10 bg-zinc-900/45 p-8 shadow-xl shadow-black/20 backdrop-blur-sm md:p-10">
              <p className="text-balance text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
                {welcomeHeading}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{accountSubtitle}</p>
              <p className="mt-2 text-sm text-zinc-500">
                Website:{" "}
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#c6a77d] underline-offset-2 hover:underline"
                  >
                    {websiteUrl}
                  </a>
                ) : (
                  <span className="text-zinc-600">Not provided</span>
                )}
                {" · "}
                <Link href="/profile" className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
                  Edit profile
                </Link>
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 p-6 ring-1 ring-white/[0.04] backdrop-blur-sm lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c6a77d]/90">Your plan</p>
                <p className="mt-3 text-lg font-semibold text-zinc-50">{planLabel}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Try-on allowance and billing follow this plan. Upgrade anytime from subscriptions.
                </p>
                <Link
                  href="/subscriptions"
                  className="mt-5 inline-flex text-sm font-semibold text-[#c6a77d] underline-offset-2 hover:underline"
                >
                  View plans
                </Link>
              </div>

              <div className="space-y-6 lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-100">Try-on usage</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Shoppers using Wear Me on your site count toward this total.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={usageLoading}
                      onClick={() => void refreshUsage()}
                      className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-zinc-950/50 px-4 text-sm font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-zinc-900/80 disabled:opacity-50"
                    >
                      {usageLoading ? "Refreshing…" : "Refresh"}
                    </button>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
                        blocked
                          ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
                          : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
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

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Try-ons used", value: used },
                    { label: "Remaining", value: remaining },
                    { label: "Monthly limit", value: limit },
                  ].map((cell) => (
                    <div
                      key={cell.label}
                      className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5 backdrop-blur-sm"
                    >
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{cell.label}</p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">
                        {typeof cell.value === "number" ? cell.value.toLocaleString() : "—"}
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-zinc-300">
                    <span>
                      {used.toLocaleString()} / {limit.toLocaleString()} try-ons
                    </span>
                    <span className="tabular-nums text-zinc-500">{pct}% of limit</span>
                  </div>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-zinc-950/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "getCode" ? (
          <div className="mt-10 max-w-3xl space-y-10">
            <div>
              <h2 className="text-lg font-semibold text-zinc-50">Your Wear Me embed code</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Copy this single line and add it to your website. It loads the try-on experience for your shoppers—no
                coding knowledge required after you paste it in the right place.
              </p>
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

            <DashboardInstallPreviewAnimation />

            <div>
              <h3 className="text-base font-semibold text-zinc-100">How to install</h3>
              <p className="mt-2 text-sm text-zinc-500">
                Follow these steps in order—each illustration shows what to look for on screen.
              </p>

              <ol className="mt-8 space-y-10">
                <li className="flex gap-5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c6a77d]/40 bg-[#c6a77d]/10 text-sm font-bold text-[#c6a77d]"
                    aria-hidden
                  >
                    1
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-100">Copy your code</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      Click the gold <strong className="font-medium text-zinc-300">Copy code</strong> button above. The
                      entire line is now on your clipboard—nothing else to select.
                    </p>
                    <InstallDiagramStep1CopyCode />
                  </div>
                </li>

                <li className="flex gap-5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c6a77d]/40 bg-[#c6a77d]/10 text-sm font-bold text-[#c6a77d]"
                    aria-hidden
                  >
                    2
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-100">Open your website editor</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      Log in to the tool you use to change your site—such as Shopify, WordPress, Squarespace, Wix, or your
                      web designer&apos;s editor. Go to the area where you can edit your theme or add custom code.
                    </p>
                    <InstallDiagramStep2Editors />
                  </div>
                </li>

                <li className="flex gap-5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c6a77d]/40 bg-[#c6a77d]/10 text-sm font-bold text-[#c6a77d]"
                    aria-hidden
                  >
                    3
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-100">Paste the code before the closing body tag</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      Find the spot labelled something like <strong className="font-medium text-zinc-300">&lt;/body&gt;</strong>{" "}
                      or &quot;footer&quot; / &quot;custom HTML&quot;. Paste your copied line on its own row just{" "}
                      <em>above</em> that closing tag so it loads on every page you want try-on on.
                    </p>
                    <InstallDiagramStep3BodyTag />
                  </div>
                </li>

                <li className="flex gap-5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#c6a77d]/40 bg-[#c6a77d]/10 text-sm font-bold text-[#c6a77d]"
                    aria-hidden
                  >
                    4
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-100">Save and publish</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      Save your changes, then publish or update your site. Open a product page in a new window and look
                      for the Wear Me experience—if it doesn&apos;t show, wait a minute for caching, then refresh.
                    </p>
                    <InstallDiagramStep4Success />
                  </div>
                </li>
              </ol>
            </div>
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
