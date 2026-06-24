/**
 * Self-serve subscription catalog defaults and pure helpers — safe for client and server imports.
 * Keys are stored in Stripe metadata and Redis (`pendingSubscriptionPlanKey`).
 * Legacy aliases: `growth` → `boutique`, `pro` → `studio` (see {@link parseSubscriptionPlanKey}).
 *
 * For Redis-backed overrides on the server, use {@link getSubscriptionPlansCatalog} from
 * `@/lib/subscriptionPlansServer`.
 */
export const SUBSCRIPTION_PLANS = {
  starter: {
    key: "starter",
    name: "Starter",
    amountGbpPence: 24_00,
    tryOnLimit: 100,
    maxTopUpPurchasesPerBillingCycle: 10,
  },
  boutique: {
    key: "boutique",
    name: "Boutique",
    amountGbpPence: 120_00,
    tryOnLimit: 500,
    maxTopUpPurchasesPerBillingCycle: 10,
  },
  studio: {
    key: "studio",
    name: "Studio",
    amountGbpPence: 240_00,
    tryOnLimit: 1000,
    maxTopUpPurchasesPerBillingCycle: 20,
  },
  premium: {
    key: "premium",
    name: "Premium",
    amountGbpPence: 480_00,
    tryOnLimit: 2000,
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export type SubscriptionPlanDefinition = {
  key: SubscriptionPlanKey;
  name: string;
  amountGbpPence: number;
  tryOnLimit: number;
  maxTopUpPurchasesPerBillingCycle?: number;
};

/** Editable plan row shape used by admin Subscription Calc and Redis catalog store. */
export type SubscriptionPlanRow = {
  name: string;
  amountGbpPence: number;
  tryOnLimit: number;
  maxTopUpPurchasesPerBillingCycle?: number;
  /** Stripe Product ID synced when prices are saved in Subscription Calc. */
  stripeProductId?: string;
  /** Active Stripe recurring Price ID for checkout (new price created when amount changes). */
  stripePriceId?: string;
};

export type SubscriptionPlanCatalog = Record<SubscriptionPlanKey, SubscriptionPlanDefinition>;

const PLAN_KEY_ORDER: readonly SubscriptionPlanKey[] = ["starter", "boutique", "studio", "premium"];

const LEGACY_PLAN_ALIASES: Record<string, SubscriptionPlanKey> = {
  growth: "boutique",
  pro: "studio",
};

export const SUBSCRIPTION_PLAN_KEYS_ORDERED: readonly SubscriptionPlanKey[] = PLAN_KEY_ORDER;

export function parseSubscriptionPlanKey(raw: unknown): SubscriptionPlanKey | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toLowerCase();
  if (k in SUBSCRIPTION_PLANS) return k as SubscriptionPlanKey;
  return LEGACY_PLAN_ALIASES[k] ?? null;
}

export function getSubscriptionPlanDefinition(
  key: SubscriptionPlanKey,
  catalog: SubscriptionPlanCatalog = SUBSCRIPTION_PLANS as unknown as SubscriptionPlanCatalog,
) {
  return catalog[key];
}

export function maxTopUpPurchasesPerBillingCycleForCatalogBaseLimit(
  basePlanTryOnLimit: number,
  catalog: SubscriptionPlanCatalog = SUBSCRIPTION_PLANS as unknown as SubscriptionPlanCatalog,
): number | null {
  const k = catalogSubscriptionPlanKeyFromTryOnLimit(basePlanTryOnLimit, catalog);
  if (!k) return null;
  const raw = catalog[k];
  const n = raw.maxTopUpPurchasesPerBillingCycle;
  return typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : null;
}

/** Map try-on limit to a known subscription name, or a generic label for custom/admin limits. */
export function planLabelFromTryOnLimit(
  limit: number,
  catalog: SubscriptionPlanCatalog = SUBSCRIPTION_PLANS as unknown as SubscriptionPlanCatalog,
): string {
  if (!Number.isFinite(limit) || limit <= 0) return "Plan";
  for (const p of Object.values(catalog)) {
    if (p.tryOnLimit === limit) return p.name;
  }
  return "Custom plan";
}

/** Maps a client's base try-on cap to a self-serve Stripe catalog tier; null for custom/admin limits. */
export function catalogSubscriptionPlanKeyFromTryOnLimit(
  limit: number,
  catalog: SubscriptionPlanCatalog = SUBSCRIPTION_PLANS as unknown as SubscriptionPlanCatalog,
): SubscriptionPlanKey | null {
  const lim = Math.floor(limit);
  if (!Number.isFinite(lim) || lim <= 0) return null;
  for (const key of PLAN_KEY_ORDER) {
    if (catalog[key].tryOnLimit === lim) return key;
  }
  return null;
}

/** Short tier label for retailer dashboard (matches catalog try-on caps). */
export function retailerDashboardPlanFromBaseLimit(
  limit: number,
  catalog: SubscriptionPlanCatalog = SUBSCRIPTION_PLANS as unknown as SubscriptionPlanCatalog,
): {
  planName: string;
  monthlyTryOnLimit: number;
  priceGbpPence: number | null;
} {
  const lim = Math.floor(limit);
  if (!Number.isFinite(lim) || lim <= 0) {
    return { planName: "Custom Plan", monthlyTryOnLimit: lim, priceGbpPence: null };
  }

  for (const key of PLAN_KEY_ORDER) {
    const p = catalog[key];
    if (p.tryOnLimit === lim) {
      return {
        planName: p.name,
        monthlyTryOnLimit: lim,
        priceGbpPence: p.amountGbpPence,
      };
    }
  }

  return { planName: "Custom Plan", monthlyTryOnLimit: lim, priceGbpPence: null };
}
