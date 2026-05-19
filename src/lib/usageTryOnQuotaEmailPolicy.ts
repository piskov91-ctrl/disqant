import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";
import { totalTryOnsUsed } from "@/lib/clientTryOnBuckets";

function crossedTryOnUsageSeventyFivePct(
  prev: ClientApiKeyRecord,
  next: ClientApiKeyRecord,
): boolean {
  const lim = next.usageLimit;
  if (!(lim > 0)) return false;
  return (
    totalTryOnsUsed(prev) * 4 < lim * 3 && totalTryOnsUsed(next) * 4 >= lim * 3
  );
}

export function alreadySentTryOnUsageSeventyFiveEmailForCycle(rec: ClientApiKeyRecord): boolean {
  const sentFor = rec.usageSeventyFivePctEmailSentForLimit;
  if (sentFor == null || !Number.isFinite(sentFor)) return false;
  return sentFor === rec.usageLimit;
}

/** True on the increment where total usage reaches the combined limit (final allowed try-on). */
export function usageIncrementReachedQuotaLimit(
  prev: ClientApiKeyRecord,
  next: ClientApiKeyRecord,
): boolean {
  const lim = next.usageLimit;
  if (!(lim > 0)) return false;
  return totalTryOnsUsed(prev) < lim && totalTryOnsUsed(next) >= lim;
}

function crossedTryOnUsageNinetyNinePct(
  prev: ClientApiKeyRecord,
  next: ClientApiKeyRecord,
): boolean {
  const lim = next.usageLimit;
  if (!(lim > 0)) return false;
  if (usageIncrementReachedQuotaLimit(prev, next)) return false;
  return (
    totalTryOnsUsed(prev) * 100 < lim * 99 && totalTryOnsUsed(next) * 100 >= lim * 99
  );
}

export function alreadySentTryOnUsageNinetyNineEmailForCycle(rec: ClientApiKeyRecord): boolean {
  const sentFor = rec.usageNinetyNinePctEmailSentForLimit;
  if (sentFor == null || !Number.isFinite(sentFor)) return false;
  return sentFor === rec.usageLimit;
}

/** True after increment when we reached 99% and have not emailed for this usage limit tier yet. */
export function usageIncrementShouldPersistNinetyNinePctEmailFlag(params: {
  prev: ClientApiKeyRecord;
  next: ClientApiKeyRecord;
}): boolean {
  const { prev, next } = params;
  if (!crossedTryOnUsageNinetyNinePct(prev, next)) return false;
  return !alreadySentTryOnUsageNinetyNineEmailForCycle(prev);
}

/** True after increment when we crossed 75% and have not emailed for this usage limit tier yet. */
export function usageIncrementShouldPersistSeventyFivePctEmailFlag(params: {
  prev: ClientApiKeyRecord;
  next: ClientApiKeyRecord;
}): boolean {
  const { prev, next } = params;
  if (!crossedTryOnUsageSeventyFivePct(prev, next)) return false;
  return !alreadySentTryOnUsageSeventyFiveEmailForCycle(prev);
}
