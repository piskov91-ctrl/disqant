import type { ClientApiKeyRecord } from "@/lib/apiKeyStore";

function crossedTryOnUsageEightyPct(
  prev: ClientApiKeyRecord,
  next: ClientApiKeyRecord,
): boolean {
  const lim = next.usageLimit;
  if (!(lim > 0)) return false;
  return prev.usageCount * 5 < lim * 4 && next.usageCount * 5 >= lim * 4;
}

export function alreadySentTryOnUsageEightyEmailForCycle(rec: ClientApiKeyRecord): boolean {
  const sentFor = rec.usageEightPctEmailSentForLimit;
  if (sentFor == null || !Number.isFinite(sentFor)) return false;
  return sentFor === rec.usageLimit;
}

function crossedTryOnUsageHundredPct(
  prev: ClientApiKeyRecord,
  next: ClientApiKeyRecord,
): boolean {
  const lim = next.usageLimit;
  if (!(lim > 0)) return false;
  return prev.usageCount < lim && next.usageCount >= lim;
}

export function alreadySentTryOnUsageHundredEmailForCycle(rec: ClientApiKeyRecord): boolean {
  const sentFor = rec.usageHundredPctEmailSentForLimit;
  if (sentFor == null || !Number.isFinite(sentFor)) return false;
  return sentFor === rec.usageLimit;
}

/** True after increment when usage reached the plan limit and we have not emailed for this usage limit tier yet. */
export function usageIncrementShouldPersistHundredPctEmailFlag(params: {
  prev: ClientApiKeyRecord;
  next: ClientApiKeyRecord;
}): boolean {
  const { prev, next } = params;
  if (!crossedTryOnUsageHundredPct(prev, next)) return false;
  return !alreadySentTryOnUsageHundredEmailForCycle(prev);
}

/** True after increment when we crossed 80% and have not emailed for this usage limit tier yet. */
export function usageIncrementShouldPersistEightyPctEmailFlag(params: {
  prev: ClientApiKeyRecord;
  next: ClientApiKeyRecord;
}): boolean {
  const { prev, next } = params;
  if (!crossedTryOnUsageEightyPct(prev, next)) return false;
  return !alreadySentTryOnUsageEightyEmailForCycle(prev);
}
