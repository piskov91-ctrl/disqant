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
  /** Try-on cap (client keys). Used when restoring limit if `basePlanLimit` is absent. */
  usageLimit?: number;
  /** Baseline cap restored on monthly billing reset (client keys). */
  basePlanLimit?: number;
  /** Purchased top-up capacity (persists across monthly resets until fully consumed). */
  topUpLimit?: number;
  /** Try-ons consumed from the top-up pool (persists across monthly resets). */
  topUpUsageCount?: number;
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
 * Subscription-only cap after monthly reset (baseline plan try-ons). When set, combined `usageLimit` becomes
 * this value plus any persisted `topUpLimit`.
 * Returns `undefined` when `basePlanLimit` is absent or invalid → caller keeps existing `usageLimit`.
 */
export function billingRestoredUsageLimit<T extends MonthlyBillingCycleFields>(cur: T): number | undefined {
  const base = cur.basePlanLimit;
  if (typeof base !== "number" || !Number.isFinite(base) || base <= 0) {
    return undefined;
  }
  return Math.floor(base);
}

/** Logged when a scheduled monthly billing reset is applied to a record. */
export type MonthlyBillingResetAppliedEvent = {
  /** UTC midnight (or scheduled day) instant for this billing reset. */
  resetDayUtcMs: number;
  /** Try-ons used immediately before this reset. */
  previousTryOns: number;
};

/**
 * Zero **subscription** try-on usage (`usageCount`) for each missed monthly boundary up to "today" (UTC),
 * updating `lastAutoBillingResetYyyymmdd` each time. Top-up purchased capacity (`topUpLimit`) and consumption
 * (`topUpUsageCount`) are unchanged — top-ups remain until fully used.
 *
 * When `basePlanLimit` is set, sets `usageLimit` to `basePlanLimit + topUpLimit`; otherwise `usageLimit` is unchanged
 * (legacy keys). Does not change `basePlanLimit`.
 *
 * Returns one event per reset applied (for admin billing history).
 */
export function applyAllDueMonthlyUsageResetsWithEvents<T extends MonthlyBillingCycleFields>(
  rec: T,
  now: Date,
): { rec: T; events: MonthlyBillingResetAppliedEvent[] } {
  const events: MonthlyBillingResetAppliedEvent[] = [];
  let cur: T = { ...rec };
  let guard = 0;
  while (guard < 48) {
    guard += 1;
    const due = peekNextDueAutoBillingResetUtc(cur, now);
    if (!due) break;
    const prevSub = Math.floor(cur.usageCount);
    const prevTop = Math.floor((cur as { topUpUsageCount?: number }).topUpUsageCount ?? 0);
    const previousTryOns = prevSub + prevTop;
    const restoredBase = billingRestoredUsageLimit(cur);
    const topLim = Math.floor((cur as MonthlyBillingCycleFields).topUpLimit ?? 0);
    const next: T = {
      ...cur,
      usageCount: 0,
      lastAutoBillingResetYyyymmdd: yyyymmddUtc(due),
      ...(restoredBase !== undefined ? { usageLimit: restoredBase + topLim } : null),
    } as T;
    const w = next as T & {
      usageSeventyFivePctEmailSentForLimit?: number;
      usageNinetyNinePctEmailSentForLimit?: number;
      topUpAllowanceTryOns?: unknown;
    };
    delete w.topUpAllowanceTryOns;
    delete w.usageSeventyFivePctEmailSentForLimit;
    delete w.usageNinetyNinePctEmailSentForLimit;
    cur = w as T;
    events.push({ resetDayUtcMs: due.getTime(), previousTryOns });
  }
  return { rec: cur, events };
}

/**
 * Zero subscription `usageCount` for each missed monthly boundary up to "today" (UTC). Top-up buckets persist.
 * When `basePlanLimit` is set, restores `usageLimit` to `basePlanLimit + topUpLimit`.
 */
export function applyAllDueMonthlyUsageResets<T extends MonthlyBillingCycleFields>(rec: T, now: Date): T {
  return applyAllDueMonthlyUsageResetsWithEvents(rec, now).rec;
}

export function monthlyBillingCycleChanged(prev: MonthlyBillingCycleFields, next: MonthlyBillingCycleFields): boolean {
  return (
    prev.usageCount !== next.usageCount ||
    prev.usageLimit !== next.usageLimit ||
    (prev.topUpLimit ?? 0) !== (next.topUpLimit ?? 0) ||
    (prev.topUpUsageCount ?? 0) !== (next.topUpUsageCount ?? 0) ||
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
