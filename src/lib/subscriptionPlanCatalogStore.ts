import { getRedis } from "@/lib/apiKeyStore";
import {
  CREDITS_PER_TRY_ON,
  FASHN_USD_PER_CREDIT,
  FASHN_USD_TO_GBP,
} from "@/lib/enterprisePriceCalculator";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/lib/subscriptionPlansData";

const CATALOG_REDIS_KEY = "fit-room:subscriptionPlans:catalog";

export type StoredSubscriptionPlanRow = {
  name: string;
  amountGbpPence: number;
  tryOnLimit: number;
  maxTopUpPurchasesPerBillingCycle?: number;
};

export type StoredSubscriptionPlanCatalog = {
  costPerTryOnGbp: number;
  plans: Record<SubscriptionPlanKey, StoredSubscriptionPlanRow>;
};

/** Default Fashn cost per try-on in GBP (2 credits × $0.075 ÷ 1.25). */
export function defaultCostPerTryOnGbp(): number {
  return (CREDITS_PER_TRY_ON * FASHN_USD_PER_CREDIT) / FASHN_USD_TO_GBP;
}

export function defaultStoredSubscriptionPlanCatalog(): StoredSubscriptionPlanCatalog {
  const plans = {} as Record<SubscriptionPlanKey, StoredSubscriptionPlanRow>;
  for (const key of Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanKey[]) {
    const p = SUBSCRIPTION_PLANS[key];
    const maxTopUps =
      "maxTopUpPurchasesPerBillingCycle" in p && typeof p.maxTopUpPurchasesPerBillingCycle === "number"
        ? p.maxTopUpPurchasesPerBillingCycle
        : undefined;
    plans[key] = {
      name: p.name,
      amountGbpPence: p.amountGbpPence,
      tryOnLimit: p.tryOnLimit,
      ...(typeof maxTopUps === "number" ? { maxTopUpPurchasesPerBillingCycle: maxTopUps } : {}),
    };
  }
  return { costPerTryOnGbp: defaultCostPerTryOnGbp(), plans };
}

function parsePositiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parsePlanRow(raw: unknown): StoredSubscriptionPlanRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const amountGbpPence = parsePositiveInt(o.amountGbpPence);
  const tryOnLimit = parsePositiveInt(o.tryOnLimit);
  if (!name.length || amountGbpPence === null || tryOnLimit === null) return null;
  const maxRaw = o.maxTopUpPurchasesPerBillingCycle;
  const maxTopUpPurchasesPerBillingCycle =
    maxRaw === undefined || maxRaw === null ? undefined : parsePositiveInt(maxRaw) ?? undefined;
  return {
    name: name.slice(0, 80),
    amountGbpPence,
    tryOnLimit,
    ...(typeof maxTopUpPurchasesPerBillingCycle === "number"
      ? { maxTopUpPurchasesPerBillingCycle }
      : {}),
  };
}

function parseStoredCatalog(raw: unknown): StoredSubscriptionPlanCatalog | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const costRaw = o.costPerTryOnGbp;
  const costN = typeof costRaw === "number" ? costRaw : Number.parseFloat(String(costRaw ?? ""));
  if (!Number.isFinite(costN) || costN < 0) return null;

  const plansRaw = o.plans;
  if (!plansRaw || typeof plansRaw !== "object") return null;

  const defaults = defaultStoredSubscriptionPlanCatalog();
  const plans = { ...defaults.plans };
  for (const key of Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanKey[]) {
    const row = parsePlanRow((plansRaw as Record<string, unknown>)[key]);
    if (row) plans[key] = row;
  }

  return { costPerTryOnGbp: costN, plans };
}

export async function getStoredSubscriptionPlanCatalog(): Promise<StoredSubscriptionPlanCatalog | null> {
  try {
    const raw = await getRedis().get(CATALOG_REDIS_KEY);
    if (raw == null) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parseStoredCatalog(parsed);
  } catch {
    return null;
  }
}

export async function setStoredSubscriptionPlanCatalog(
  catalog: StoredSubscriptionPlanCatalog,
): Promise<void> {
  const parsed = parseStoredCatalog(catalog);
  if (!parsed) throw new Error("Invalid subscription plan catalog.");
  await getRedis().set(CATALOG_REDIS_KEY, JSON.stringify(parsed));
}
