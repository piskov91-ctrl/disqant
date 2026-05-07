import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";

function crossedTryOnUsageSeventyFivePct(
  prev: ClientApiKeyRecord,
  next: ClientApiKeyRecord,
): boolean {
  const lim = next.usageLimit;
  if (!(lim > 0)) return false;
  return prev.usageCount * 4 < lim * 3 && next.usageCount * 4 >= lim * 3;
}

export function alreadySentTryOnUsageSeventyFiveEmailForCycle(rec: ClientApiKeyRecord): boolean {
  const sentFor = rec.usageSeventyFivePctEmailSentForLimit;
  if (sentFor == null || !Number.isFinite(sentFor)) return false;
  return sentFor === rec.usageLimit;
}

/** True on the increment where usage reaches the plan limit (final allowed try-on). */
export function usageIncrementReachedQuotaLimit(
  prev: ClientApiKeyRecord,
  next: ClientApiKeyRecord,
): boolean {
  const lim = next.usageLimit;
  if (!(lim > 0)) return false;
  return prev.usageCount < lim && next.usageCount >= lim;
}

function crossedTryOnUsageNinetyNinePct(
  prev: ClientApiKeyRecord,
  next: ClientApiKeyRecord,
): boolean {
  const lim = next.usageLimit;
  if (!(lim > 0)) return false;
  if (usageIncrementReachedQuotaLimit(prev, next)) return false;
  return prev.usageCount * 100 < lim * 99 && next.usageCount * 100 >= lim * 99;
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
