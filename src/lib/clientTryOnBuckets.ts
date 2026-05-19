/** Fields needed for subscription vs top-up bucket logic (matches `ClientApiKeyRecord`). */
export type TryOnBucketFields = {
  usageCount: number;
  usageLimit: number;
  basePlanLimit?: number;
  topUpLimit?: number;
  topUpUsageCount?: number;
  /** @deprecated migrated into `topUpLimit` */
  topUpAllowanceTryOns?: number;
};

/**
 * Persisted monthly plan cap, or derived from total − top-up when legacy rows omit `basePlanLimit`.
 * Use this when displaying `usageCount / basePlanLimit` in UI.
 */
export function storedOrDerivedBasePlanLimit(rec: TryOnBucketFields): number {
  if (typeof rec.basePlanLimit === "number" && rec.basePlanLimit > 0) {
    return Math.floor(rec.basePlanLimit);
  }
  const top = Math.floor(rec.topUpLimit ?? 0);
  return Math.max(0, Math.floor(rec.usageLimit) - top);
}

/** Subscription plan cap (same as {@link storedOrDerivedBasePlanLimit}). */
export function subscriptionPlanCap(rec: TryOnBucketFields): number {
  return storedOrDerivedBasePlanLimit(rec);
}

export function totalTryOnsUsed(rec: TryOnBucketFields): number {
  return Math.floor(rec.usageCount) + Math.floor(rec.topUpUsageCount ?? 0);
}

/** Whether no try-on slot remains (subscription first, then top-up). */
export function clientTryOnFullyBlocked(rec: TryOnBucketFields): boolean {
  const planCap = subscriptionPlanCap(rec);
  const topLim = Math.floor(rec.topUpLimit ?? 0);
  const topUsed = Math.floor(rec.topUpUsageCount ?? 0);
  const subUsed = Math.floor(rec.usageCount);
  return subUsed >= planCap && topUsed >= topLim;
}

/**
 * Ensures subscription vs top-up counters match stored caps (migrates legacy combined `usageCount`
 * and old `topUpAllowanceTryOns`). Does not persist — caller writes when needed.
 */
export function normalizeClientTryOnBuckets<T extends TryOnBucketFields>(rec: T): T {
  let topLim = Math.floor(rec.topUpLimit ?? 0);
  if (typeof rec.topUpAllowanceTryOns === "number" && rec.topUpAllowanceTryOns > 0 && topLim === 0) {
    topLim = Math.floor(rec.topUpAllowanceTryOns);
  }

  const planCap = subscriptionPlanCap({ ...rec, topUpLimit: topLim });

  let subUsed = Math.floor(rec.usageCount);
  let topUsed = Math.floor(rec.topUpUsageCount ?? 0);

  if (topLim > 0 && topUsed === 0 && subUsed > planCap) {
    topUsed = Math.min(topLim, subUsed - planCap);
    subUsed = planCap;
  }

  topUsed = Math.min(Math.max(0, topUsed), topLim);
  subUsed = Math.min(Math.max(0, subUsed), planCap);

  const usageLimit = planCap + topLim;

  const next = {
    ...rec,
    usageCount: subUsed,
    topUpUsageCount: topUsed,
    topUpLimit: topLim,
    usageLimit,
    basePlanLimit: rec.basePlanLimit ?? planCap,
  } as T;

  delete (next as TryOnBucketFields & { topUpAllowanceTryOns?: unknown }).topUpAllowanceTryOns;

  return next;
}

export function sameBucketSnapshot(a: TryOnBucketFields, b: TryOnBucketFields): boolean {
  return (
    a.usageCount === b.usageCount &&
    (a.topUpUsageCount ?? 0) === (b.topUpUsageCount ?? 0) &&
    (a.topUpLimit ?? 0) === (b.topUpLimit ?? 0) &&
    a.usageLimit === b.usageLimit &&
    (a.basePlanLimit ?? null) === (b.basePlanLimit ?? null)
  );
}
