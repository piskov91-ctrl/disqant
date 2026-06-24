import {
  defaultStoredSubscriptionPlanCatalog,
  getStoredSubscriptionPlanCatalog,
  type StoredSubscriptionPlanCatalog,
} from "@/lib/subscriptionPlanCatalogStore";
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
