/** Fashn API cost per credit (USD). */
export const FASHN_USD_PER_CREDIT = 0.075;

/** USD → GBP divisor used for Fashn cost estimates. */
export const FASHN_USD_TO_GBP = 1.25;

export const CREDITS_PER_TRY_ON = 2;

/** Volume brackets for recommended enterprise pricing (£ per try-on). */
export const ENTERPRISE_RECOMMENDED_RATE_TIERS = [
  { maxTryOns: 2500, rateGbp: 0.28, label: "Up to 2,500" },
  { maxTryOns: 3000, rateGbp: 0.27, label: "Up to 3,000" },
  { maxTryOns: 5000, rateGbp: 0.24, label: "Up to 5,000" },
  { maxTryOns: 10000, rateGbp: 0.22, label: "Up to 10,000" },
  { maxTryOns: Number.POSITIVE_INFINITY, rateGbp: 0.2, label: "Above 10,000" },
] as const;

export const MAX_ENTERPRISE_DISCOUNT_PCT = 50;

export type EnterpriseDiscountResult = {
  discountPct: number;
  discountedPriceGbp: number;
  profitAfterDiscountGbp: number;
  marginAfterDiscountPct: number;
};

export function parseEnterpriseDiscountPct(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed.length) return 0;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > MAX_ENTERPRISE_DISCOUNT_PCT) return null;
  return n;
}

/** Apply a discount (0–50%) to the recommended price and derive profit vs Fashn cost. */
export function computeEnterpriseRecommendedDiscount(
  recommendedPriceGbp: number,
  fashnCostGbp: number,
  discountPct: number,
): EnterpriseDiscountResult | null {
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > MAX_ENTERPRISE_DISCOUNT_PCT) {
    return null;
  }
  const discountedPriceGbp = recommendedPriceGbp * (1 - discountPct / 100);
  const profitAfterDiscountGbp = discountedPriceGbp - fashnCostGbp;
  const marginAfterDiscountPct =
    discountedPriceGbp > 0 ? (profitAfterDiscountGbp / discountedPriceGbp) * 100 : 0;
  return {
    discountPct,
    discountedPriceGbp,
    profitAfterDiscountGbp,
    marginAfterDiscountPct,
  };
}

export type EnterprisePriceOption = {
  totalGbp: number;
  profitGbp: number;
  marginPct: number;
};

export type EnterpriseRecommendedOption = EnterprisePriceOption & {
  rateGbpPerTryOn: number;
  tierLabel: string;
};

export type EnterprisePricingBreakdown = {
  tryOns: number;
  credits: number;
  fashnCostGbp: number;
  recommended: EnterpriseRecommendedOption;
  mid: EnterprisePriceOption;
  minimum: EnterprisePriceOption;
};

export function recommendedRateGbpPerTryOn(tryOns: number): {
  rateGbp: number;
  tierLabel: string;
} {
  const n = Math.floor(tryOns);
  for (const tier of ENTERPRISE_RECOMMENDED_RATE_TIERS) {
    if (n <= tier.maxTryOns) {
      return { rateGbp: tier.rateGbp, tierLabel: tier.label };
    }
  }
  const last = ENTERPRISE_RECOMMENDED_RATE_TIERS[ENTERPRISE_RECOMMENDED_RATE_TIERS.length - 1];
  return { rateGbp: last.rateGbp, tierLabel: last.label };
}

function optionFromTotal(totalGbp: number, fashnCostGbp: number): EnterprisePriceOption {
  const profitGbp = totalGbp - fashnCostGbp;
  const marginPct = totalGbp > 0 ? (profitGbp / totalGbp) * 100 : 0;
  return { totalGbp, profitGbp, marginPct };
}

/** Compute credits, Fashn cost, and three enterprise price options for a try-on volume. */
export function computeEnterprisePricing(tryOns: number): EnterprisePricingBreakdown | null {
  const n = Math.floor(tryOns);
  if (!Number.isFinite(n) || n <= 0) return null;

  const credits = n * CREDITS_PER_TRY_ON;
  const fashnCostGbp = (credits * FASHN_USD_PER_CREDIT) / FASHN_USD_TO_GBP;
  const { rateGbp, tierLabel } = recommendedRateGbpPerTryOn(n);
  const recommendedTotal = n * rateGbp;

  return {
    tryOns: n,
    credits,
    fashnCostGbp,
    recommended: {
      ...optionFromTotal(recommendedTotal, fashnCostGbp),
      rateGbpPerTryOn: rateGbp,
      tierLabel,
    },
    mid: optionFromTotal(fashnCostGbp * 2, fashnCostGbp),
    minimum: optionFromTotal(fashnCostGbp * 1.5, fashnCostGbp),
  };
}
