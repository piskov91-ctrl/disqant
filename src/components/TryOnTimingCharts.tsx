import type { TryOnTimingBuckets } from "@/lib/platformAnalytics";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function hourTickLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

function normalize24(values: number[] | undefined): number[] {
  return Array.from({ length: 24 }, (_, i) => {
    const v = values?.[i];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  });
}

function normalize7(values: number[] | undefined): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const v = values?.[i];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  });
}

export type TryOnTimingChartsProps = TryOnTimingBuckets & {
  variant?: "admin" | "dashboard";
  /** Shown under the main title (e.g. “Your store’s try-ons”). */
  subtitle?: string;
  showWeekdays?: boolean;
  /** No outer card or page-level titles — for nesting (e.g. analytics modal). */
  embedded?: boolean;
};

export function TryOnTimingCharts({
  tryOnByHourUtc,
  tryOnByWeekdayUtc,
  variant = "dashboard",
  subtitle,
  showWeekdays = true,
  embedded = false,
}: TryOnTimingChartsProps) {
  const hours = normalize24(tryOnByHourUtc);
  const days = normalize7(tryOnByWeekdayUtc);
  const maxHour = Math.max(1, ...hours);
  const maxDay = Math.max(1, ...days);

  const isAdmin = variant === "admin";
  const card = isAdmin
    ? "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8"
    : "rounded-2xl border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-sm";
  const titleCls = isAdmin ? "text-base font-semibold text-zinc-100" : "text-lg font-semibold text-zinc-50";
  const descCls = "mt-1 text-sm text-zinc-400";
  const trackCls = isAdmin ? "rounded-sm bg-zinc-800" : "rounded-sm border border-white/10 bg-zinc-950/50";
  const barCls = "rounded-sm bg-gradient-to-t from-[#8b7355] to-[#d4bc94]";
  const tickCls = isAdmin ? "text-[10px] text-zinc-600" : "text-[10px] text-zinc-500";

  const totalTryOns = hours.reduce((s, n) => s + n, 0);

  const hourBlock = (
    <div>
      {!embedded ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-zinc-300">When people try clothes on — by time of day</h3>
          <span className="text-xs tabular-nums text-zinc-500">
            {totalTryOns.toLocaleString()} completed try-on{totalTryOns === 1 ? "" : "s"} in view
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs tabular-nums text-zinc-500">
            {totalTryOns.toLocaleString()} try-on{totalTryOns === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div className={`flex gap-0.5 sm:gap-px md:gap-0.5 ${embedded ? "mt-2" : "mt-4"}`}>
        {hours.map((count, hour) => (
          <div key={hour} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-28 w-full max-w-[14px] flex-col justify-end ${trackCls}`}
              title={
                count > 0
                  ? `${count.toLocaleString()} try-on${count === 1 ? "" : "s"} between ${hour}:00 and ${hour}:59`
                  : "No try-ons in this hour"
              }
            >
              <div
                className={`w-full ${barCls}`}
                style={{ height: `${(count / maxHour) * 100}%`, minHeight: count > 0 ? 2 : 0 }}
              />
            </div>
            {hour % 4 === 0 ? (
              <span className={`${tickCls} tabular-nums`}>{hourTickLabel(hour)}</span>
            ) : (
              <span className={`${tickCls} select-none opacity-0`} aria-hidden>
                ·
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-zinc-600">Across the clock — midnight on the left, late night on the right.</p>
    </div>
  );

  const weekdayBlock =
    showWeekdays ? (
      <div>
        <h3 className="text-sm font-medium text-zinc-300">Busiest days of the week</h3>
        <p className="mt-1 text-xs text-zinc-500">Shows which weekdays shoppers actually use Wear Me — great for spotting weekend vs weekday lifts.</p>
        <div className="mt-4 space-y-2">
          {days.map((count, d) => (
            <div key={d} className="flex items-center gap-3">
              <span className="w-9 shrink-0 text-xs font-medium text-zinc-400">{WEEKDAY_LABELS[d]}</span>
              <div className={`min-h-6 min-w-0 flex-1 overflow-hidden rounded-full ${trackCls}`}>
                <div
                  className={`h-6 rounded-full ${barCls}`}
                  style={{ width: `${(count / maxDay) * 100}%`, minWidth: count > 0 ? 4 : 0 }}
                  title={`${WEEKDAY_LABELS[d]} — ${count.toLocaleString()} try-on${count === 1 ? "" : "s"}`}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                {count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  if (embedded) {
    return (
      <div className="space-y-0">
        {hourBlock}
        {weekdayBlock ? <div className="mt-8">{weekdayBlock}</div> : null}
      </div>
    );
  }

  return (
    <div className={card}>
      <h2 className={titleCls}>When customers use Wear Me</h2>
      {subtitle ? <p className={descCls}>{subtitle}</p> : null}
      <p className={subtitle ? "mt-2 text-sm text-zinc-400" : descCls}>
        These charts add up finished try-ons on your storefront — anytime someone sees a result from Wear Me after trying
        something on. Use them to see whether traffic clusters on certain hours or weekdays.
      </p>

      <div className="mt-8 space-y-10">
        {hourBlock}
        {weekdayBlock}
      </div>
    </div>
  );
}
