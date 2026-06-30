import { getRedis } from "@/lib/apiKeyStore";
import type { StoredSubscriptionPlanCatalog } from "@/lib/subscriptionPlanCatalogStore";
import { SUBSCRIPTION_PLAN_KEYS_ORDERED, type SubscriptionPlanKey } from "@/lib/subscriptionPlansData";

/** Runtime overrides for Stripe subscription Price IDs (mirrors Vercel env var names). */
const REDIS_KEY = "fit-room:stripe:env:subscription-price-ids";

export const STRIPE_SUBSCRIPTION_PRICE_ENV_KEYS = {
  starter: "STRIPE_PRICE_SUBSCRIPTION_STARTER",
  boutique: "STRIPE_PRICE_SUBSCRIPTION_BOUTIQUE",
  boutiqueLegacy: "STRIPE_PRICE_SUBSCRIPTION_GROWTH",
  studio: "STRIPE_PRICE_SUBSCRIPTION_STUDIO",
  studioLegacy: "STRIPE_PRICE_SUBSCRIPTION_PRO",
  premium: "STRIPE_PRICE_SUBSCRIPTION_PREMIUM",
} as const;

export type StripeSubscriptionPriceEnvRecord = Partial<
  Record<(typeof STRIPE_SUBSCRIPTION_PRICE_ENV_KEYS)[keyof typeof STRIPE_SUBSCRIPTION_PRICE_ENV_KEYS], string>
>;

function pickPriceId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

function priceIdForPlanKeyFromEnvRecord(
  record: StripeSubscriptionPriceEnvRecord,
  planKey: SubscriptionPlanKey,
): string | undefined {
  switch (planKey) {
    case "starter":
      return pickPriceId(record.STRIPE_PRICE_SUBSCRIPTION_STARTER);
    case "boutique":
      return (
        pickPriceId(record.STRIPE_PRICE_SUBSCRIPTION_BOUTIQUE) ??
        pickPriceId(record.STRIPE_PRICE_SUBSCRIPTION_GROWTH)
      );
    case "studio":
      return (
        pickPriceId(record.STRIPE_PRICE_SUBSCRIPTION_STUDIO) ??
        pickPriceId(record.STRIPE_PRICE_SUBSCRIPTION_PRO)
      );
    case "premium":
      return pickPriceId(record.STRIPE_PRICE_SUBSCRIPTION_PREMIUM);
    default:
      return undefined;
  }
}

/** Process env only — used as bootstrap before Subscription Calc has saved once. */
export function stripeCatalogSubscriptionPriceIdFromProcessEnv(
  planKey: SubscriptionPlanKey,
): string | undefined {
  const pick = (s: string | undefined) => (s && s.trim().length > 0 ? s.trim() : undefined);
  const byKey: Record<SubscriptionPlanKey, string | undefined> = {
    starter: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_STARTER),
    boutique:
      pick(process.env.STRIPE_PRICE_SUBSCRIPTION_BOUTIQUE) ?? pick(process.env.STRIPE_PRICE_SUBSCRIPTION_GROWTH),
    studio: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_STUDIO) ?? pick(process.env.STRIPE_PRICE_SUBSCRIPTION_PRO),
    premium: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_PREMIUM),
  };
  return byKey[planKey];
}

export async function getSubscriptionStripePriceEnvFromRedis(): Promise<StripeSubscriptionPriceEnvRecord | null> {
  try {
    const raw = await getRedis().get(REDIS_KEY);
    if (raw == null) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return null;
    const out: StripeSubscriptionPriceEnvRecord = {};
    for (const value of Object.values(STRIPE_SUBSCRIPTION_PRICE_ENV_KEYS)) {
      const id = pickPriceId((parsed as Record<string, unknown>)[value]);
      if (id) out[value] = id;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export async function setSubscriptionStripePriceEnvInRedis(
  record: StripeSubscriptionPriceEnvRecord,
): Promise<void> {
  await getRedis().set(REDIS_KEY, JSON.stringify(record));
}

/** Write `STRIPE_PRICE_SUBSCRIPTION_*` values to Redis from synced catalog Price IDs. */
export async function persistSubscriptionStripePriceEnvFromCatalog(
  catalog: StoredSubscriptionPlanCatalog,
): Promise<StripeSubscriptionPriceEnvRecord> {
  const record: StripeSubscriptionPriceEnvRecord = {};

  for (const planKey of SUBSCRIPTION_PLAN_KEYS_ORDERED) {
    const priceId = catalog.plans[planKey].stripePriceId?.trim();
    if (!priceId) continue;

    if (planKey === "starter") {
      record.STRIPE_PRICE_SUBSCRIPTION_STARTER = priceId;
    } else if (planKey === "boutique") {
      record.STRIPE_PRICE_SUBSCRIPTION_BOUTIQUE = priceId;
      record.STRIPE_PRICE_SUBSCRIPTION_GROWTH = priceId;
    } else if (planKey === "studio") {
      record.STRIPE_PRICE_SUBSCRIPTION_STUDIO = priceId;
      record.STRIPE_PRICE_SUBSCRIPTION_PRO = priceId;
    } else if (planKey === "premium") {
      record.STRIPE_PRICE_SUBSCRIPTION_PREMIUM = priceId;
    }
  }

  await setSubscriptionStripePriceEnvInRedis(record);
  return record;
}

/**
 * Effective catalog Price ID: Redis env overrides (updated on Subscription Calc save) → process env.
 */
export async function resolveStripeCatalogSubscriptionPriceId(
  planKey: SubscriptionPlanKey,
): Promise<string | undefined> {
  const redis = await getSubscriptionStripePriceEnvFromRedis();
  if (redis) {
    const fromRedis = priceIdForPlanKeyFromEnvRecord(redis, planKey);
    if (fromRedis) return fromRedis;
  }
  return stripeCatalogSubscriptionPriceIdFromProcessEnv(planKey);
}

export function subscriptionStripePriceEnvRedisKey(): string {
  return REDIS_KEY;
}
