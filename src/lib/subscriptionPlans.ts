export const SUBSCRIPTION_PLANS = {
  starter: {
    key: "starter",
    name: "Fit Room Starter",
    amountGbpPence: 149_00,
    tryOnLimit: 300,
  },
  growth: {
    key: "growth",
    name: "Fit Room Growth",
    amountGbpPence: 299_00,
    tryOnLimit: 600,
  },
  pro: {
    key: "pro",
    name: "Fit Room Pro",
    amountGbpPence: 599_00,
    tryOnLimit: 1200,
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Optional Stripe recurring Price IDs (Dashboard catalog). When set, subscription Checkout uses `{ price, quantity: 1 }`
 * only — recurring invoices stay tied to that catalog price (base plan only). Top-ups remain separate `mode: payment`
 * sessions and never attach as subscription items.
 */
export function stripeCatalogSubscriptionPriceId(planKey: SubscriptionPlanKey): string | undefined {
  const raw =
    planKey === "starter"
      ? process.env.STRIPE_PRICE_SUBSCRIPTION_STARTER?.trim()
      : planKey === "growth"
        ? process.env.STRIPE_PRICE_SUBSCRIPTION_GROWTH?.trim()
        : process.env.STRIPE_PRICE_SUBSCRIPTION_PRO?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

export function parseSubscriptionPlanKey(raw: unknown): SubscriptionPlanKey | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toLowerCase();
  if (k in SUBSCRIPTION_PLANS) return k as SubscriptionPlanKey;
  return null;
}

export function getSubscriptionPlanDefinition(key: SubscriptionPlanKey) {
  return SUBSCRIPTION_PLANS[key];
}

/** Map try-on limit to a known subscription name, or a generic label for custom/admin limits. */
export function planLabelFromTryOnLimit(limit: number): string {
  if (!Number.isFinite(limit) || limit <= 0) return "Plan";
  for (const p of Object.values(SUBSCRIPTION_PLANS)) {
    if (p.tryOnLimit === limit) return p.name;
  }
  return "Custom plan";
}

/** Short tier label for retailer dashboard (matches SUBSCRIPTION_PLANS try-on caps). */
export function retailerDashboardPlanFromBaseLimit(limit: number): {
  planName: string;
  monthlyTryOnLimit: number;
  priceGbpPence: number | null;
} {
  const lim = Math.floor(limit);
  if (!Number.isFinite(lim) || lim <= 0) {
    return { planName: "Custom Plan", monthlyTryOnLimit: lim, priceGbpPence: null };
  }

  const tierNames: Record<SubscriptionPlanKey, string> = {
    starter: "Starter",
    growth: "Growth",
    pro: "Pro",
  };

  for (const key of ["starter", "growth", "pro"] as const) {
    const p = SUBSCRIPTION_PLANS[key];
    if (p.tryOnLimit === lim) {
      return {
        planName: tierNames[key],
        monthlyTryOnLimit: lim,
        priceGbpPence: p.amountGbpPence,
      };
    }
  }

  return { planName: "Custom Plan", monthlyTryOnLimit: lim, priceGbpPence: null };
}
