"use client";

import type {
  WearMeBusyTimeSlot,
  WearMeDailyTryOnPoint,
  WearMeRetailDashboardStats,
  WearMeWeekdayBar,
} from "@/lib/wearMeRetailDashboardStats";
import { useId } from "react";
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

type WearMeTooltipProps<T> = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: T }>;
};

/** Internal row for charts (slot total for % in tooltip). */
type SlotChartRow = WearMeBusyTimeSlot & { hiddenTotal: number };

function TimelineTooltip({
  active,
  payload,
}: WearMeTooltipProps<WearMeDailyTryOnPoint>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const n = row.count;
  return (
    <div className="rounded-lg border border-white/15 bg-zinc-950/95 px-3 py-2 text-sm shadow-xl backdrop-blur-sm">
      <p className="font-medium text-zinc-100">{row.shortLabel}</p>
      <p className="mt-0.5 tabular-nums text-[#e8dcc8]">
        {n.toLocaleString()} try-on{n === 1 ? "" : "s"}
      </p>
    </div>
  );
}

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
  const { allTimeTryOnTotal, dailyTryOnsLast30, busyTimeSlots, weekdaysMondayFirst } = stats;

  const timeline = dailyTryOnsLast30.map((d) => ({ ...d }));

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-zinc-50">Try-ons — last 30 days</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Each point is how many outfits shoppers finished per day — useful for spotting busy spells.
              </p>
            </div>
          </div>
          <div className="mt-6 h-[240px] w-full md:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={chartMargin()}>
                <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="4 8" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fill: TICK, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                  minTickGap={8}
                />
                <YAxis
                  tick={{ fill: TICK, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={36}
                />
                <Tooltip content={<TimelineTooltip />} cursor={{ stroke: ACCENT_MUTED }} />
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
