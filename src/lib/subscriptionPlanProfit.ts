import type { SubscriptionPlanKey } from "@/lib/subscriptionPlansData";
import type { StoredSubscriptionPlanRow } from "@/lib/subscriptionPlanCatalogStore";

export type SubscriptionPlanProfitRow = {
  key: SubscriptionPlanKey;
  name: string;
  amountGbpPence: number;
  tryOnLimit: number;
  revenueGbp: number;
  costGbp: number;
  netProfitGbp: number;
  marginPct: number;
};

export function computeSubscriptionPlanProfit(
  key: SubscriptionPlanKey,
  plan: StoredSubscriptionPlanRow,
  costPerTryOnGbp: number,
): SubscriptionPlanProfitRow {
  const revenueGbp = plan.amountGbpPence / 100;
  const costGbp = plan.tryOnLimit * costPerTryOnGbp;
  const netProfitGbp = revenueGbp - costGbp;
  const marginPct = revenueGbp > 0 ? (netProfitGbp / revenueGbp) * 100 : 0;
  return {
    key,
    name: plan.name,
    amountGbpPence: plan.amountGbpPence,
    tryOnLimit: plan.tryOnLimit,
    revenueGbp,
    costGbp,
    netProfitGbp,
    marginPct,
  };
}

/** Plan key with the highest profit margin; ties broken by higher net profit. */
export function recommendedProfitMarginPlanKey(
  rows: SubscriptionPlanProfitRow[],
): SubscriptionPlanKey | null {
  if (rows.length === 0) return null;
  let best = rows[0]!;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.marginPct > best.marginPct + 1e-9) {
      best = row;
      continue;
    }
    if (Math.abs(row.marginPct - best.marginPct) < 1e-9 && row.netProfitGbp > best.netProfitGbp) {
      best = row;
    }
  }
  return best.key;
}
