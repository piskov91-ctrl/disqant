import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { normalizeClientTryOnBuckets, subscriptionPlanCap } from "@/lib/clientTryOnBuckets";

/**
 * Monthly subscription bucket is fully consumed (excluding top-ups). Pending upgrades apply only after this point.
 */
export function subscriptionMonthlyBucketExhausted(rec: Pick<ClientApiKeyRecord, "usageCount" | "basePlanLimit" | "usageLimit" | "topUpLimit">): boolean {
  const norm = normalizeClientTryOnBuckets(rec as ClientApiKeyRecord);
  const cap = subscriptionPlanCap(norm);
  return Math.floor(norm.usageCount) >= cap;
}

export function tryApplyPendingSubscriptionPlan(rec: ClientApiKeyRecord): {
  next: ClientApiKeyRecord;
  activated: boolean;
} {
  const norm = normalizeClientTryOnBuckets(rec);
  const pending = norm.pendingBasePlanLimit;

  const stripPending = (): ClientApiKeyRecord => {
    const cleaned = { ...norm };
    delete cleaned.pendingBasePlanLimit;
    delete cleaned.pendingSubscriptionPlanKey;
    delete cleaned.pendingPlanRecordedAt;
    return normalizeClientTryOnBuckets(cleaned);
  };

  if (pending == null || !Number.isFinite(pending)) {
    return { next: norm, activated: false };
  }

  const pendingLim = Math.floor(pending as number);
  if (pendingLim < 1) {
    return { next: stripPending(), activated: false };
  }

  if (!subscriptionMonthlyBucketExhausted(norm)) {
    return { next: norm, activated: false };
  }

  const nextRaw: ClientApiKeyRecord = { ...norm, basePlanLimit: pendingLim, usageCount: 0 };
  delete nextRaw.pendingBasePlanLimit;
  delete nextRaw.pendingSubscriptionPlanKey;
  delete nextRaw.pendingPlanRecordedAt;

  return {
    next: normalizeClientTryOnBuckets(nextRaw),
    activated: true,
  };
}
