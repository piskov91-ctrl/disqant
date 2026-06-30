import {
  defaultStoredSubscriptionPlanCatalog,
  getStoredSubscriptionPlanCatalog,
  type StoredSubscriptionPlanCatalog,
} from "@/lib/subscriptionPlanCatalogStore";
import { getStripe, isStripeLiveMode } from "@/lib/stripeServer";
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
 * Live mode (`sk_live_`): env catalog prices win over Redis (avoids stale test Price IDs after go-live).
 * Test mode: Redis-synced Subscription Calc prices win over env.
 */
export async function buildSubscriptionPriceIdToPlanMap(): Promise<Map<string, SubscriptionPlanKey>> {
  const stored = await getStoredSubscriptionPlanCatalog();
  const map = new Map<string, SubscriptionPlanKey>();
  const live = isStripeLiveMode();

  for (const planKey of SUBSCRIPTION_PLAN_KEYS_ORDERED) {
    const envId = stripeCatalogSubscriptionPriceId(planKey);
    const redisId = stored?.plans[planKey]?.stripePriceId?.trim();

    if (live) {
      if (envId) map.set(envId, planKey);
      if (redisId && !map.has(redisId)) {
        if (await stripePriceRetrievable(redisId)) map.set(redisId, planKey);
      }
    } else {
      if (redisId) map.set(redisId, planKey);
      if (envId && !map.has(envId)) map.set(envId, planKey);
    }
  }

  return map;
}

export async function resolvePlanKeyFromStripePriceId(priceId: string): Promise<SubscriptionPlanKey | null> {
  const map = await buildSubscriptionPriceIdToPlanMap();
  return map.get(priceId.trim()) ?? null;
}

/** Stripe Price ID for subscription Checkout — live env vars override stale Redis test IDs. */
export async function resolveSubscriptionCheckoutPriceId(
  planKey: SubscriptionPlanKey,
): Promise<string | undefined> {
  const envId = stripeCatalogSubscriptionPriceId(planKey);
  const stored = await getStoredSubscriptionPlanCatalog();
  const redisId = stored?.plans[planKey]?.stripePriceId?.trim();

  if (isStripeLiveMode()) {
    if (envId) return envId;
    if (redisId && (await stripePriceRetrievable(redisId))) return redisId;
    return undefined;
  }

  if (redisId) return redisId;
  return envId;
}

/**
 * Optional Stripe recurring Price IDs (Dashboard catalog). When set, subscription Checkout uses `{ price, quantity: 1 }`
 * only — recurring invoices stay tied to that catalog price (base plan only). Top-ups remain separate `mode: payment`
 * sessions and never attach as subscription items.
 *
 * `boutique` / `studio` fall back to older `STRIPE_PRICE_SUBSCRIPTION_GROWTH` / `STRIPE_PRICE_SUBSCRIPTION_PRO` env names.
 */
export function stripeCatalogSubscriptionPriceId(planKey: SubscriptionPlanKey): string | undefined {
  const pick = (s: string | undefined) => (s && s.trim().length > 0 ? s.trim() : undefined);
  const byKey: Record<SubscriptionPlanKey, string | undefined> = {
    starter: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_STARTER),
    boutique: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_BOUTIQUE) ?? pick(process.env.STRIPE_PRICE_SUBSCRIPTION_GROWTH),
    studio: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_STUDIO) ?? pick(process.env.STRIPE_PRICE_SUBSCRIPTION_PRO),
    premium: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_PREMIUM),
  };
  return byKey[planKey];
}
