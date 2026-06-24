import {
  defaultStoredSubscriptionPlanCatalog,
  getStoredSubscriptionPlanCatalog,
  type StoredSubscriptionPlanCatalog,
} from "@/lib/subscriptionPlanCatalogStore";

/**
 * Self-serve subscription catalog defaults. Keys are stored in Stripe metadata and Redis (`pendingSubscriptionPlanKey`).
 * Legacy aliases: `growth` → `boutique`, `pro` → `studio` (see {@link parseSubscriptionPlanKey}).
 *
 * Runtime values may be overridden via Redis — use {@link getSubscriptionPlansCatalog} on the server.
 */
export const SUBSCRIPTION_PLANS = {
  starter: {
    key: "starter",
    name: "Starter",
    amountGbpPence: 50_00,
    tryOnLimit: 100,
    maxTopUpPurchasesPerBillingCycle: 10,
  },
  boutique: {
    key: "boutique",
    name: "Boutique",
    amountGbpPence: 149_00,
    tryOnLimit: 500,
    maxTopUpPurchasesPerBillingCycle: 10,
  },
  studio: {
    key: "studio",
    name: "Studio",
    amountGbpPence: 299_00,
    tryOnLimit: 1000,
    maxTopUpPurchasesPerBillingCycle: 20,
  },
  premium: {
    key: "premium",
    name: "Premium",
    amountGbpPence: 599_00,
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

export type SubscriptionPlanCatalog = Record<SubscriptionPlanKey, SubscriptionPlanDefinition>;

const PLAN_KEY_ORDER: readonly SubscriptionPlanKey[] = ["starter", "boutique", "studio", "premium"];

const LEGACY_PLAN_ALIASES: Record<string, SubscriptionPlanKey> = {
  growth: "boutique",
  pro: "studio",
};

function catalogFromStored(stored: StoredSubscriptionPlanCatalog): SubscriptionPlanCatalog {
  const out = {} as SubscriptionPlanCatalog;
  for (const key of PLAN_KEY_ORDER) {
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

export async function getSubscriptionPlanDefinitionAsync(key: SubscriptionPlanKey) {
  const catalog = await getSubscriptionPlansCatalog();
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

export const SUBSCRIPTION_PLAN_KEYS_ORDERED: readonly SubscriptionPlanKey[] = PLAN_KEY_ORDER;
