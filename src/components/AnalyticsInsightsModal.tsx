"use client";

import { ImageOff, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { TryOnTimingCharts } from "@/components/TryOnTimingCharts";
import { LOCAL_OR_UNKNOWN_PRODUCT } from "@/lib/tryOnConstants";

export type AnalyticsInsightsPayload = {
  tryOnByHourUtc: number[];
  products: Array<{
    productImageUrl: string;
    displayName: string;
    tryOnCount: number;
  }>;
};

type Theme = "admin" | "site";

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

export function AnalyticsInsightsModal({
  open,
  onClose,
  fetchUrl,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  fetchUrl: string;
  theme: Theme;
}) {
  const [data, setData] = useState<AnalyticsInsightsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(fetchUrl);
      const json = (await res.json()) as AnalyticsInsightsPayload & { error?: string };
      if (!res.ok) {
        setError(json.error || "Could not load analytics.");
        setData(null);
        return;
      }
      setData({
        tryOnByHourUtc: Array.isArray(json.tryOnByHourUtc) ? json.tryOnByHourUtc : [],
        products: Array.isArray(json.products) ? json.products : [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const isAdmin = theme === "admin";
  const panel = isAdmin
    ? "max-h-[min(90vh,880px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
    : "max-h-[min(90vh,880px)] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl";

  const pad = isAdmin ? "text-zinc-100" : "text-zinc-50";
  const muted = isAdmin ? "text-zinc-400" : "text-zinc-400";
  const chartVariant = isAdmin ? "admin" : "dashboard";

  const hourArr = Array.from({ length: 24 }, (_, i) =>
    typeof data?.tryOnByHourUtc?.[i] === "number" && Number.isFinite(data.tryOnByHourUtc[i])
      ? data.tryOnByHourUtc[i]
      : 0,
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <div
        className={`relative flex flex-col ${panel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-modal-title"
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 sm:px-6 ${
            isAdmin ? "border-zinc-800" : "border-white/10"
          }`}
        >
          <div className="min-w-0">
            <h2 id="analytics-modal-title" className={`text-lg font-semibold ${pad}`}>
              Analytics
            </h2>
            <p className={`mt-1 text-sm ${muted}`}>Peak try-on hours (UTC) and every product ranked by usage.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
              isAdmin
                ? "border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                : "border-white/15 text-zinc-300 hover:bg-white/5"
            }`}
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {loading && !data ? (
            <p className={`text-sm ${muted}`}>Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : data ? (
            <div className="space-y-10">
              <section>
                <h3 className={`text-sm font-semibold ${pad}`}>Peak hours</h3>
                <p className={`mt-1 text-xs ${muted}`}>When try-ons complete, by hour of day (UTC).</p>
                <div className="mt-4">
                  <TryOnTimingCharts
                    variant={chartVariant}
                    embedded
                    showWeekdays={false}
                    tryOnByHourUtc={hourArr}
                    tryOnByWeekdayUtc={Array.from({ length: 7 }, () => 0)}
                  />
                </div>
              </section>

              <section>
                <h3 className={`text-sm font-semibold ${pad}`}>Products tried on</h3>
                <p className={`mt-1 text-xs ${muted}`}>Sorted by try-on count (most popular first).</p>
                {data.products.length === 0 ? (
                  <p className={`mt-4 text-sm ${muted}`}>No product attribution yet.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 bg-zinc-950/40">
                    {data.products.map((p) => (
                      <li key={p.productImageUrl} className="flex items-center gap-4 px-4 py-3">
                        <ProductThumb url={p.productImageUrl} />
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${pad}`}>{p.displayName}</p>
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
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
