/** Value for Stripe Checkout Session `metadata.checkout_kind` (webhook routing). */
export const STRIPE_TOP_UP_CHECKOUT_KIND = "top_up" as const;

export type TopUpPackId = "100" | "300" | "500";

export type TopUpPack = {
  id: TopUpPackId;
  tryOns: number;
  /** Price in pence (Stripe unit_amount). */
  amountGbpPence: number;
  label: string;
};

export const TOP_UP_PACKS: readonly TopUpPack[] = [
  { id: "100", tryOns: 100, amountGbpPence: 2500, label: "100 try-ons — £25" },
  { id: "300", tryOns: 300, amountGbpPence: 6500, label: "300 try-ons — £65" },
  { id: "500", tryOns: 500, amountGbpPence: 9900, label: "500 try-ons — £99" },
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
