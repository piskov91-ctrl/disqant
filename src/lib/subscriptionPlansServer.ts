import {
  defaultStoredSubscriptionPlanCatalog,
  getStoredSubscriptionPlanCatalog,
  type StoredSubscriptionPlanCatalog,
} from "@/lib/subscriptionPlanCatalogStore";
import { getStripe } from "@/lib/stripeServer";
import {
  resolveStripeCatalogSubscriptionPriceId,
  stripeCatalogSubscriptionPriceIdFromProcessEnv,
} from "@/lib/subscriptionStripePriceEnvStore";
import {
  SUBSCRIPTION_PLAN_KEYS_ORDERED,
  type SubscriptionPlanCatalog,
  type SubscriptionPlanKey,
} from "@/lib/subscriptionPlansData";

function catalogFromStored(stored: StoredSubscriptionPlanCatalog): SubscriptionPlanCatalog {
  const out = {} as SubscriptionPlanCatalog;
  for (const key of SUBSCRIPTION_PLAN_KEYS_ORDERED) {
    const row = stored.plans[key];
    out[key] = {
      key,
      name: row.name,
      amountGbpPence: row.amountGbpPence,
      tryOnLimit: row.tryOnLimit,
      ...(typeof row.maxTopUpPurchasesPerBillingCycle === "number"
        ? { maxTopUpPurchasesPerBillingCycle: row.maxTopUpPurchasesPerBillingCycle }
        : {}),
    };
  }
  return out;
}

/** Effective subscription catalog (Redis overrides merged with code defaults). */
export async function getSubscriptionPlansCatalog(): Promise<SubscriptionPlanCatalog> {
  const stored = await getStoredSubscriptionPlanCatalog();
  return catalogFromStored(stored ?? defaultStoredSubscriptionPlanCatalog());
}

export async function getSubscriptionPlanDefinitionAsync(key: SubscriptionPlanKey) {
  const catalog = await getSubscriptionPlansCatalog();
  return catalog[key];
}

async function stripePriceRetrievable(priceId: string): Promise<boolean> {
  try {
    await getStripe().prices.retrieve(priceId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Price ID → plan map for webhook fulfillment and checkout.
 * Uses Redis `STRIPE_PRICE_SUBSCRIPTION_*` overrides (Subscription Calc save), then catalog, then process env.
 */
export async function buildSubscriptionPriceIdToPlanMap(): Promise<Map<string, SubscriptionPlanKey>> {
  const stored = await getStoredSubscriptionPlanCatalog();
  const map = new Map<string, SubscriptionPlanKey>();

  for (const planKey of SUBSCRIPTION_PLAN_KEYS_ORDERED) {
    const effectiveId = await resolveStripeCatalogSubscriptionPriceId(planKey);
    const catalogId = stored?.plans[planKey]?.stripePriceId?.trim();
    const processEnvId = stripeCatalogSubscriptionPriceIdFromProcessEnv(planKey);

    if (effectiveId) map.set(effectiveId, planKey);
    if (catalogId && !map.has(catalogId)) map.set(catalogId, planKey);
    if (processEnvId && !map.has(processEnvId)) map.set(processEnvId, planKey);
  }

  return map;
}

export async function resolvePlanKeyFromStripePriceId(priceId: string): Promise<SubscriptionPlanKey | null> {
  const map = await buildSubscriptionPriceIdToPlanMap();
  return map.get(priceId.trim()) ?? null;
}

/** Stripe Price ID for subscription Checkout — Redis env overrides, then catalog, then process env. */
export async function resolveSubscriptionCheckoutPriceId(
  planKey: SubscriptionPlanKey,
): Promise<string | undefined> {
  const fromRedisEnv = await resolveStripeCatalogSubscriptionPriceId(planKey);
  if (fromRedisEnv) return fromRedisEnv;

  const stored = await getStoredSubscriptionPlanCatalog();
  const catalogId = stored?.plans[planKey]?.stripePriceId?.trim();
  if (catalogId && (await stripePriceRetrievable(catalogId))) return catalogId;

  return stripeCatalogSubscriptionPriceIdFromProcessEnv(planKey);
}

/**
 * @deprecated Prefer {@link resolveStripeCatalogSubscriptionPriceId} for runtime resolution.
 * Process env only (Vercel-deployed `STRIPE_PRICE_SUBSCRIPTION_*`).
 */
export function stripeCatalogSubscriptionPriceId(planKey: SubscriptionPlanKey): string | undefined {
  return stripeCatalogSubscriptionPriceIdFromProcessEnv(planKey);
}
