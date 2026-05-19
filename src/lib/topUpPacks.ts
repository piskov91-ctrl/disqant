/** Value for Stripe Checkout Session `metadata.checkout_kind` (webhook routing). */
export const STRIPE_TOP_UP_CHECKOUT_KIND = "top_up" as const;

/** £0.55 per try-on — same unit rate as the smallest fixed pack (100 × £0.55 = £55). */
export const TOP_UP_CUSTOM_PENCE_PER_TRY_ON = 55 as const;

export const TOP_UP_CUSTOM_MIN_TRY_ONS = 50 as const;

/** Upper bound for self-serve custom checkout (prevents absurd line items). */
export const TOP_UP_CUSTOM_MAX_TRY_ONS = 50_000 as const;

export function customTopUpAmountGbpPence(tryOns: number): number {
  return tryOns * TOP_UP_CUSTOM_PENCE_PER_TRY_ON;
}

/** Validates integer try-on count for custom top-up checkout. */
export function parseCustomTopUpTryOns(raw: unknown): number | null {
  let n: number;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    n = Math.floor(raw);
  } else if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    n = Number.parseInt(t, 10);
  } else {
    return null;
  }
  if (!Number.isInteger(n)) return null;
  if (n < TOP_UP_CUSTOM_MIN_TRY_ONS || n > TOP_UP_CUSTOM_MAX_TRY_ONS) return null;
  return n;
}

export type TopUpPackId = "100" | "300" | "500";

export type TopUpPack = {
  id: TopUpPackId;
  tryOns: number;
  /** Price in pence (Stripe unit_amount). */
  amountGbpPence: number;
  label: string;
};

export const TOP_UP_PACKS: readonly TopUpPack[] = [
  { id: "100", tryOns: 100, amountGbpPence: 5500, label: "100 try-ons — £55" },
  { id: "300", tryOns: 300, amountGbpPence: 15500, label: "300 try-ons — £155" },
  { id: "500", tryOns: 500, amountGbpPence: 24500, label: "500 try-ons — £245" },
] as const;

const byId: Record<TopUpPackId, TopUpPack> = {
  "100": TOP_UP_PACKS[0],
  "300": TOP_UP_PACKS[1],
  "500": TOP_UP_PACKS[2],
};

export function getTopUpPackById(id: TopUpPackId): TopUpPack {
  return byId[id];
}

export function parseTopUpPackId(raw: unknown): TopUpPackId | null {
  if (raw === "100" || raw === "300" || raw === "500") return raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t === "100" || t === "300" || t === "500") return t;
  }
  return null;
}
