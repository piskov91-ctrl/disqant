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

export function parseSubscriptionPlanKey(raw: unknown): SubscriptionPlanKey | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toLowerCase();
  if (k in SUBSCRIPTION_PLANS) return k as SubscriptionPlanKey;
  return null;
}

export function getSubscriptionPlanDefinition(key: SubscriptionPlanKey) {
  return SUBSCRIPTION_PLANS[key];
}
