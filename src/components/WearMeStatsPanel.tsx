"use client";

import {
  daysInUtcMonth,
  isoDayUtcShortUk,
  type WearMeBusyTimeSlot,
  type WearMeDailyTryOnPoint,
  type WearMeRetailDashboardStats,
  type WearMeWeekdayBar,
} from "@/lib/wearMeRetailDashboardStats";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ACCENT = "#d4bc94";
const ACCENT_MUTED = "rgba(212, 188, 148, 0.35)";
const GRID = "rgba(255,255,255,0.06)";
const TICK = "#a1a1aa";

function utcNowYm(): { y: number; m0: number } {
  const d = new Date();
  return { y: d.getUTCFullYear(), m0: d.getUTCMonth() };
}

function cmpYm(a: { y: number; m0: number }, b: { y: number; m0: number }): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m0 === b.m0) return 0;
  return a.m0 < b.m0 ? -1 : 1;
}

function prevUtcMonth(y: number, m0: number): { y: number; m0: number } {
  const d = new Date(Date.UTC(y, m0 - 1, 1));
  return { y: d.getUTCFullYear(), m0: d.getUTCMonth() };
}

function nextUtcMonth(y: number, m0: number): { y: number; m0: number } {
  const d = new Date(Date.UTC(y, m0 + 1, 1));
  return { y: d.getUTCFullYear(), m0: d.getUTCMonth() };
}

function ymFromIsoDate(isoDate: string): { y: number; m0: number } | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return { y, m0: mo - 1 };
}

function utcMonthTitleLong(y: number, m0: number): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m0, 1)),
  );
}

function utcMonthTitleShort(y: number, m0: number): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m0, 1)),
  );
}

function paddedYmd(y: number, m0: number, day: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function sumMonthTryOns(map: Map<string, number>, y: number, m0: number): number {
  const dim = daysInUtcMonth(y, m0);
  let total = 0;
  for (let day = 1; day <= dim; day++) total += map.get(paddedYmd(y, m0, day)) ?? 0;
  return total;
}

type WearMeTooltipProps<T> = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: T }>;
};

/** Internal row for charts (slot total for % in tooltip). */
type SlotChartRow = WearMeBusyTimeSlot & { hiddenTotal: number };

function BusySlotTooltip({ active, payload }: WearMeTooltipProps<SlotChartRow>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const n = row.count;
  const total =
    typeof row.hiddenTotal === "number" ? row.hiddenTotal : n;
  const pct =
    total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div className="max-w-xs rounded-lg border border-white/15 bg-zinc-950/95 px-3 py-2 text-sm shadow-xl backdrop-blur-sm">
      <p className="font-medium text-zinc-100">{row.label}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{row.hint}</p>
      <p className="mt-1 tabular-nums text-[#e8dcc8]">
        {n.toLocaleString()} try-ons
        <span className="text-zinc-500"> · {pct}% share</span>
      </p>
    </div>
  );
}

function WeekdayTooltip({ active, payload }: WearMeTooltipProps<WearMeWeekdayBar>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-white/15 bg-zinc-950/95 px-3 py-2 text-sm shadow-xl backdrop-blur-sm">
      <p className="font-medium text-zinc-100">{row.label}</p>
      <p className="mt-0.5 tabular-nums text-[#e8dcc8]">
        {row.count.toLocaleString()} try-on{row.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function chartMargin() {
  return { top: 8, right: 8, left: -8, bottom: 0 };
}

export function WearMeStatsPanel({ stats }: { stats: WearMeRetailDashboardStats }) {
  const uid = useId().replace(/:/g, "");
  const barGradientId = `wearMeGoldBar-${uid}`;
  const { allTimeTryOnTotal, dailyTryOnsByDate, busyTimeSlots, weekdaysMondayFirst } = stats;

  const [viewYm, setViewYm] = useState<{ y: number; m0: number }>(() => utcNowYm());

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of dailyTryOnsByDate) {
      map.set(row.date, Math.max(0, Math.floor(row.count)));
    }
    return map;
  }, [dailyTryOnsByDate]);

  const minYm = useMemo(() => {
    if (!dailyTryOnsByDate.length) return utcNowYm();
    const parsed = ymFromIsoDate(dailyTryOnsByDate[0]!.date);
    return parsed ?? utcNowYm();
  }, [dailyTryOnsByDate]);

  useEffect(() => {
    const max = utcNowYm();
    setViewYm((v) => {
      if (cmpYm(v, max) > 0) return max;
      if (cmpYm(v, minYm) < 0) return minYm;
      return v;
    });
  }, [dailyTryOnsByDate, minYm]);

  const canGoPrev = cmpYm(viewYm, minYm) > 0;
  const canGoNext = cmpYm(viewYm, utcNowYm()) < 0;

  const monthTimeline = useMemo((): WearMeDailyTryOnPoint[] => {
    const { y, m0 } = viewYm;
    const dim = daysInUtcMonth(y, m0);
    const pts: WearMeDailyTryOnPoint[] = [];
    for (let day = 1; day <= dim; day++) {
      const date = paddedYmd(y, m0, day);
      const count = countByDate.get(date) ?? 0;
      pts.push({
        date,
        /** Day-of-month on the horizontal axis keeps the chart tidy. */
        shortLabel: String(day),
        count,
      });
    }
    return pts;
  }, [viewYm, countByDate]);

  const selectedMonthTotal = sumMonthTryOns(countByDate, viewYm.y, viewYm.m0);
  const prevM = prevUtcMonth(viewYm.y, viewYm.m0);
  const previousMonthTotal = sumMonthTryOns(countByDate, prevM.y, prevM.m0);

  let comparisonLine: string;
  let comparisonToneClass = "text-zinc-300";

  const prevLabelShort = utcMonthTitleShort(prevM.y, prevM.m0);
  const selectedLong = utcMonthTitleLong(viewYm.y, viewYm.m0);

  if (previousMonthTotal === 0 && selectedMonthTotal === 0) {
    comparisonLine = `${selectedLong}: no finishes yet (previous month (${prevLabelShort}) was quiet too).`;
    comparisonToneClass = "text-zinc-500";
  } else if (previousMonthTotal === 0) {
    comparisonLine = `${selectedLong}: ${selectedMonthTotal.toLocaleString()} total — first finishes after a quiet ${prevLabelShort}.`;
    comparisonToneClass = "text-[#d4bc94]/90";
  } else {
    const delta = selectedMonthTotal - previousMonthTotal;
    const pct = Math.round((delta / previousMonthTotal) * 100);
    const dir =
      delta > 0 ? "Up" : delta < 0 ? "Down" : "Flat";
    comparisonLine = `${selectedLong}: ${selectedMonthTotal.toLocaleString()} total · Previous (${prevLabelShort}): ${previousMonthTotal.toLocaleString()} · ${dir} ${Math.abs(delta).toLocaleString()} (${pct >= 0 ? "+" : ""}${pct}%).`;
    if (delta > 0) comparisonToneClass = "text-emerald-200/95";
    else if (delta < 0) comparisonToneClass = "text-amber-200/92";
    else comparisonToneClass = "text-zinc-400";
  }

  const slotTotal = busyTimeSlots.reduce((a, b) => a + b.count, 0);
  const slotRows: SlotChartRow[] = busyTimeSlots.map((s) => ({ ...s, hiddenTotal: slotTotal }));

  const maxWeekCount = weekdaysMondayFirst.reduce((m, w) => Math.max(m, w.count), 0);
  const busiestDay = weekdaysMondayFirst.reduce(
    (best, cur) => (cur.count > best.count ? cur : best),
    weekdaysMondayFirst[0] ?? { label: "", count: 0 },
  );

  const busiestSlot = busyTimeSlots.reduce(
    (best, cur) => (cur.count > best.count ? cur : best),
    busyTimeSlots[0],
  );

  const tooltipLabelByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of monthTimeline) {
      m.set(row.date, isoDayUtcShortUk(row.date));
    }
    return m;
  }, [monthTimeline]);

  const monthTimelineForChart = monthTimeline.map((row) => ({
    ...row,
    /** Full UK-style label for tooltip (see custom tooltip below). */
    tooltipLabel: tooltipLabelByDate.get(row.date) ?? row.shortLabel,
  }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-[#c6a77d]/28 bg-gradient-to-br from-black/55 via-black/40 to-black/30 p-8 shadow-inner shadow-black/40 backdrop-blur-xl md:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/80">
          All finished try-ons
        </p>
        <p
          className="mt-3 tabular-nums text-5xl font-semibold tracking-tight text-zinc-50 md:text-[3.25rem]"
          aria-live="polite"
        >
          {allTimeTryOnTotal.toLocaleString()}
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
          Every virtual outfit your shoppers completed with Wear Me on your storefront, counted since we started
          tracking.
        </p>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm md:p-8 lg:col-span-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-zinc-50">Try-ons by day</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                One calendar month at a time — scroll back through older months anytime. Months follow UTC (studio
                clock).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/12 bg-zinc-950/55 px-1 py-1">
                <button
                  type="button"
                  disabled={!canGoPrev}
                  onClick={() => setViewYm((v) => prevUtcMonth(v.y, v.m0))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
                <span
                  className="min-w-[9.5rem] px-3 text-center text-sm font-semibold tabular-nums text-zinc-100 sm:min-w-[11rem]"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {utcMonthTitleLong(viewYm.y, viewYm.m0)}
                </span>
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() => setViewYm((v) => nextUtcMonth(v.y, v.m0))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          </div>

          <div
            className={`mt-5 rounded-xl border border-white/[0.07] bg-zinc-950/35 px-4 py-3 text-sm leading-relaxed ${comparisonToneClass}`}
            aria-live="polite"
          >
            {comparisonLine}
          </div>

          <div className="mt-6 h-[240px] w-full md:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthTimelineForChart} margin={chartMargin()}>
                <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 8" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fill: TICK, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                  minTickGap={4}
                />
                <YAxis
                  tick={{ fill: TICK, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ stroke: ACCENT_MUTED }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-white/15 bg-zinc-950/95 px-3 py-2 text-sm shadow-xl backdrop-blur-sm">
                        <p className="font-medium text-zinc-100">
                          {(payload[0]?.payload as { tooltipLabel?: string }).tooltipLabel}
                        </p>
                        <p className="mt-0.5 tabular-nums text-[#e8dcc8]">
                          {typeof payload[0]?.value === "number"
                            ? `${payload[0]?.value!.toLocaleString()} try-on${payload[0]?.value === 1 ? "" : "s"}`
                            : null}
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Try-ons"
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: ACCENT, stroke: "#18181b", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
            Day-by-day numbers come from stored try-on timestamps ({dailyTryOnsByDate.length.toLocaleString()} calendar
            days in your history). Older activity may drop off if logs rotate; the headline total above still reflects
            your full count.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm md:p-8 lg:col-span-6">
          <h3 className="text-base font-semibold text-zinc-50">Busiest times of day</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            Rough times of day when try-ons clustered — mornings through late night, so you spot patterns quickly.
          </p>
          {busiestSlot && busiestSlot.count > 0 ? (
            <p className="mt-3 text-sm text-[#d4bc94]/90">
              Highest so far: <span className="font-medium">{busiestSlot.label}</span>.
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Waiting for activity to build up here.</p>
          )}
          <div className="mt-6 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slotRows} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid stroke={GRID} horizontal={false} strokeDasharray="4 8" />
                <XAxis type="number" tick={{ fill: TICK, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={88}
                  tick={{ fill: TICK, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<BusySlotTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar
                  dataKey="count"
                  name="Try-ons"
                  radius={[0, 6, 6, 0]}
                  fill={`url(#${barGradientId})`}
                  maxBarSize={28}
                />
                <defs>
                  <linearGradient id={barGradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b7355" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#d4bc94" stopOpacity={0.95} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-sm md:p-8 lg:col-span-6">
          <h3 className="text-base font-semibold text-zinc-50">Busy days — Mon to Sun</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            Which weekdays pull the most finishes — Mondays first, Sundays last.
          </p>
          {busiestDay && busiestDay.count > 0 ? (
            <p className="mt-3 text-sm text-[#d4bc94]/90">
              Peak day: <span className="font-medium">{busiestDay.label}</span>.
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Quiet so far across the whole week.</p>
          )}
          <div className="mt-6 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdaysMondayFirst} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 8" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: TICK, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: TICK, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={36}
                  domain={[0, Math.max(maxWeekCount, 1)]}
                />
                <Tooltip content={<WeekdayTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" name="Try-ons" radius={[6, 6, 0, 0]} fill={ACCENT} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
