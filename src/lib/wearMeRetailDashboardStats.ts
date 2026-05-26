/**
 * Wear Me retailer dashboard analytics shape + pure helpers (no Redis).
 * Used by `platformAnalytics` and client components for typings / empty states.
 */

/** One calendar day in UTC (`YYYY-MM-DD`) → try-on finishes recorded in that day’s slice of the event log. */
export type WearMeDailyCount = { date: string; count: number };

export type WearMeDailyTryOnPoint = { date: string; shortLabel: string; count: number };
export type WearMeBusyTimeSlot = {
  /** Stable key for React lists / chart mapping. */
  key: string;
  label: string;
  hint: string;
  count: number;
};
export type WearMeWeekdayBar = { label: string; count: number };

export type WearMeRetailDashboardStats = {
  allTimeTryOnTotal: number;
  /** All days seen in try-on events (within server scan cap), sorted ascending by `date`. Sparse — omit days with zero. */
  dailyTryOnsByDate: WearMeDailyCount[];
  busyTimeSlots: WearMeBusyTimeSlot[];
  weekdaysMondayFirst: WearMeWeekdayBar[];
};

/** Recent window for slot / weekday rollups (still uses last N UTC days ending today). */
export const WEAR_ME_TIMELINE_DAYS = 30;
export const WEAR_ME_MS_DAY = 86_400_000;

/** Monday-first labels aligned with weekday counts ([Mon … Sun]). */
export const WEAR_ME_WEEKDAY_MONDAY_FIRST_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function utcYyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function utcDayStartMs(y: number, m0: number, day: number): number {
  return Date.UTC(y, m0, day, 0, 0, 0, 0);
}

export function buildLastNDatesUtcDescending(nDays: number): string[] {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m0 = now.getUTCMonth();
  const d = now.getUTCDate();
  const todayMid = utcDayStartMs(y, m0, d);
  const out: string[] = [];
  for (let i = nDays - 1; i >= 0; i--) {
    const ms = todayMid - i * WEAR_ME_MS_DAY;
    out.push(utcYyyyMmDd(new Date(ms)));
  }
  return out;
}

/** How many calendar days in a UTC month (28–31). */
export function daysInUtcMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

export function isoDayUtcShortUk(isoYyyyMmDdDate: string): string {
  const parts = isoYyyyMmDdDate.split("-");
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return isoYyyyMmDdDate;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, mo - 1, day)),
  );
}

export function partOfDayFromHour(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 6 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  if (hour >= 18 && hour <= 22) return "evening";
  return "night";
}

export function emptyBusySlots(counts: {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
}): WearMeBusyTimeSlot[] {
  return [
    {
      key: "morning",
      label: "Morning",
      hint: "After opening through lunch",
      count: counts.morning,
    },
    {
      key: "afternoon",
      label: "Afternoon",
      hint: "Midday shoppers",
      count: counts.afternoon,
    },
    {
      key: "evening",
      label: "Evening",
      hint: "After work wind-down",
      count: counts.evening,
    },
    {
      key: "night",
      label: "Night",
      hint: "Late browsing",
      count: counts.night,
    },
  ];
}

export function busySlotsFromHourlyTotals(hours: number[]): WearMeBusyTimeSlot[] {
  const b = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (let h = 0; h < 24; h++) {
    const add = typeof hours[h] === "number" && Number.isFinite(hours[h]) ? Math.floor(hours[h]) : 0;
    const slot = partOfDayFromHour(h);
    b[slot] += add;
  }
  return emptyBusySlots(b);
}

export function weekdaysMondayFirstBars(sunday0: number[]): WearMeWeekdayBar[] {
  return WEAR_ME_WEEKDAY_MONDAY_FIRST_LABELS.map((label, i) => {
    const sundayIndexed = ((i + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const c =
      typeof sunday0[sundayIndexed] === "number" && Number.isFinite(sunday0[sundayIndexed])
        ? Math.floor(sunday0[sundayIndexed])
        : 0;
    return { label, count: c };
  });
}

/** Zero-filled dashboard stats aligned with UTC “today”. */
export function emptyWearMeRetailDashboardStats(): WearMeRetailDashboardStats {
  return {
    allTimeTryOnTotal: 0,
    dailyTryOnsByDate: [],
    busyTimeSlots: emptyBusySlots({ morning: 0, afternoon: 0, evening: 0, night: 0 }),
    weekdaysMondayFirst: WEAR_ME_WEEKDAY_MONDAY_FIRST_LABELS.map((label) => ({ label, count: 0 })),
  };
}
