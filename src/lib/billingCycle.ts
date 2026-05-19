/**
 * Monthly billing-day logic (UTC). Reset runs on the subscriber's calendar day each month;
 * if that day does not exist (e.g. subscribed on 31st in February), use the last day of that month.
 */

export type MonthlyBillingCycleFields = {
  createdAt: string;
  billingAnchorDay?: number;
  lastAutoBillingResetYyyymmdd?: string;
  usageCount: number;
  usageSeventyFivePctEmailSentForLimit?: number;
  usageNinetyNinePctEmailSentForLimit?: number;
};

/** Valid billing anchor day in 1..31 derived from a UTC instant (day-of-month of subscription). */
export function billingAnchorDayFromUtcDate(d: Date): number {
  if (!Number.isFinite(d.getTime())) return 1;
  return Math.min(31, Math.max(1, d.getUTCDate()));
}

export function billingResetDayForMonthUtc(year: number, monthIndex0: number, anchorDay: number): number {
  const dim = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  return Math.min(Math.max(1, anchorDay), dim);
}

export function utcMidnightCalendar(y: number, monthIndex0: number, day: number): Date {
  return new Date(Date.UTC(y, monthIndex0, day, 0, 0, 0, 0));
}

export function utcCalendarDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function yyyymmddUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function resolveBillingAnchorDay(rec: { billingAnchorDay?: number; createdAt: string }): number {
  if (typeof rec.billingAnchorDay === "number" && rec.billingAnchorDay >= 1 && rec.billingAnchorDay <= 31) {
    return Math.floor(rec.billingAnchorDay);
  }
  const d = new Date(rec.createdAt);
  return billingAnchorDayFromUtcDate(d);
}

function nextMonthYearMonth(y: number, m0: number): { y: number; m0: number } {
  if (m0 === 11) return { y: y + 1, m0: 0 };
  return { y, m0: m0 + 1 };
}

/** First scheduled reset strictly after subscription (never on the signup calendar day). */
export function firstAutoBillingResetUtcAfterSubscribe(createdAtIso: string, anchorDay: number): Date {
  const sub = new Date(createdAtIso);
  if (!Number.isFinite(sub.getTime())) {
    return utcMidnightCalendar(1970, 0, 1);
  }
  const y = sub.getUTCFullYear();
  const m = sub.getUTCMonth();
  const subDay = sub.getUTCDate();
  const sched0 = billingResetDayForMonthUtc(y, m, anchorDay);
  if (sched0 > subDay) return utcMidnightCalendar(y, m, sched0);
  if (sched0 < subDay) {
    const nm = nextMonthYearMonth(y, m);
    const d = billingResetDayForMonthUtc(nm.y, nm.m0, anchorDay);
    return utcMidnightCalendar(nm.y, nm.m0, d);
  }
  const nm = nextMonthYearMonth(y, m);
  const d = billingResetDayForMonthUtc(nm.y, nm.m0, anchorDay);
  return utcMidnightCalendar(nm.y, nm.m0, d);
}

export function nextAutoBillingResetUtcAfterLast(lastYyyymmdd: string, anchorDay: number): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lastYyyymmdd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (!Number.isFinite(y) || mo < 0 || mo > 11 || day < 1 || day > 31) return null;
  const nm = nextMonthYearMonth(y, mo);
  const dNext = billingResetDayForMonthUtc(nm.y, nm.m0, anchorDay);
  return utcMidnightCalendar(nm.y, nm.m0, dNext);
}

function peekNextDueAutoBillingResetUtc<T extends MonthlyBillingCycleFields>(rec: T, now: Date): Date | null {
  const anchor = resolveBillingAnchorDay(rec);
  const todayStart = utcCalendarDayStart(now);
  let candidate: Date;
  if (rec.lastAutoBillingResetYyyymmdd?.trim()) {
    const n = nextAutoBillingResetUtcAfterLast(rec.lastAutoBillingResetYyyymmdd, anchor);
    if (!n) return null;
    candidate = n;
  } else {
    candidate = firstAutoBillingResetUtcAfterSubscribe(rec.createdAt, anchor);
  }
  if (utcCalendarDayStart(candidate).getTime() <= todayStart.getTime()) return candidate;
  return null;
}

/**
 * Zero `usageCount` for each missed monthly boundary up to "today" (UTC), updating
 * `lastAutoBillingResetYyyymmdd` each time. Does not change `usageLimit`.
 */
export function applyAllDueMonthlyUsageResets<T extends MonthlyBillingCycleFields>(rec: T, now: Date): T {
  let cur: T = { ...rec };
  let guard = 0;
  while (guard < 48) {
    guard += 1;
    const due = peekNextDueAutoBillingResetUtc(cur, now);
    if (!due) break;
    const next: T = {
      ...cur,
      usageCount: 0,
      lastAutoBillingResetYyyymmdd: yyyymmddUtc(due),
    };
    const w = next as T & {
      usageSeventyFivePctEmailSentForLimit?: number;
      usageNinetyNinePctEmailSentForLimit?: number;
    };
    delete w.usageSeventyFivePctEmailSentForLimit;
    delete w.usageNinetyNinePctEmailSentForLimit;
    cur = w as T;
  }
  return cur;
}

export function monthlyBillingCycleChanged(prev: MonthlyBillingCycleFields, next: MonthlyBillingCycleFields): boolean {
  return (
    prev.usageCount !== next.usageCount ||
    prev.lastAutoBillingResetYyyymmdd !== next.lastAutoBillingResetYyyymmdd ||
    prev.usageSeventyFivePctEmailSentForLimit !== next.usageSeventyFivePctEmailSentForLimit ||
    prev.usageNinetyNinePctEmailSentForLimit !== next.usageNinetyNinePctEmailSentForLimit
  );
}

/**
 * Next scheduled monthly reset (UTC calendar) on or after today, from billing fields only.
 * Advances past missed schedule slots so it matches post-catch-up state.
 */
export function getNextMonthlyResetUtcDateForDisplay(
  rec: Pick<MonthlyBillingCycleFields, "createdAt" | "billingAnchorDay" | "lastAutoBillingResetYyyymmdd">,
  now = new Date(),
): Date {
  const anchor = resolveBillingAnchorDay(rec);
  const todayStart = utcCalendarDayStart(now);

  let candidate: Date;
  if (rec.lastAutoBillingResetYyyymmdd?.trim()) {
    const n = nextAutoBillingResetUtcAfterLast(rec.lastAutoBillingResetYyyymmdd, anchor);
    candidate = n ?? firstAutoBillingResetUtcAfterSubscribe(rec.createdAt, anchor);
  } else {
    candidate = firstAutoBillingResetUtcAfterSubscribe(rec.createdAt, anchor);
  }

  let guard = 0;
  while (guard < 48) {
    guard += 1;
    if (utcCalendarDayStart(candidate).getTime() >= todayStart.getTime()) {
      return candidate;
    }
    const ymd = yyyymmddUtc(candidate);
    const n = nextAutoBillingResetUtcAfterLast(ymd, anchor);
    if (!n) break;
    candidate = n;
  }
  return candidate;
}
