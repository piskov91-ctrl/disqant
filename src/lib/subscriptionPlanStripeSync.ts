import { getStripe } from "@/lib/stripeServer";
import type { StoredSubscriptionPlanCatalog } from "@/lib/subscriptionPlanCatalogStore";
import { SUBSCRIPTION_PLAN_KEYS_ORDERED, type SubscriptionPlanKey } from "@/lib/subscriptionPlansData";

function stripeEnvCatalogSubscriptionPriceId(planKey: SubscriptionPlanKey): string | undefined {
  const pick = (s: string | undefined) => (s && s.trim().length > 0 ? s.trim() : undefined);
  const byKey: Record<SubscriptionPlanKey, string | undefined> = {
    starter: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_STARTER),
    boutique: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_BOUTIQUE) ?? pick(process.env.STRIPE_PRICE_SUBSCRIPTION_GROWTH),
    studio: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_STUDIO) ?? pick(process.env.STRIPE_PRICE_SUBSCRIPTION_PRO),
    premium: pick(process.env.STRIPE_PRICE_SUBSCRIPTION_PREMIUM),
  };
  return byKey[planKey];
}

function stripeProductIdFromRef(product: string | { id: string } | null | undefined): string | null {
  if (typeof product === "string" && product.trim().length > 0) return product.trim();
  if (product && typeof product === "object" && typeof product.id === "string" && product.id.trim().length > 0) {
    return product.id.trim();
  }
  return null;
}

function subscriptionProductName(planName: string): string {
  const trimmed = planName.trim();
  return trimmed.length > 0 ? `${trimmed} — Wear Me subscription` : "Wear Me subscription";
}

async function resolveStripeProductId(params: {
  planKey: SubscriptionPlanKey;
  row: StoredSubscriptionPlanCatalog["plans"][SubscriptionPlanKey];
  envPriceId: string | undefined;
}): Promise<string> {
  const stripe = getStripe();
  const storedProductId = params.row.stripeProductId?.trim();
  if (storedProductId) return storedProductId;

  const envPriceId = params.envPriceId?.trim();
  if (envPriceId) {
    const envPrice = await stripe.prices.retrieve(envPriceId);
    const productId = stripeProductIdFromRef(envPrice.product);
    if (productId) return productId;
  }

  const product = await stripe.products.create({
    name: subscriptionProductName(params.row.name),
    metadata: { subscription_plan_key: params.planKey },
  });
  return product.id;
}

async function ensureActiveStripePrice(params: {
  planKey: SubscriptionPlanKey;
  row: StoredSubscriptionPlanCatalog["plans"][SubscriptionPlanKey];
  productId: string;
  previousRow: StoredSubscriptionPlanCatalog["plans"][SubscriptionPlanKey] | undefined;
  envPriceId: string | undefined;
}): Promise<string> {
  const stripe = getStripe();
  const candidateIds = [
    params.row.stripePriceId?.trim(),
    params.previousRow?.stripePriceId?.trim(),
    params.envPriceId?.trim(),
  ].filter((id): id is string => Boolean(id));

  for (const priceId of candidateIds) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.unit_amount === params.row.amountGbpPence && price.active) {
        return price.id;
      }
    } catch {
      // Try next candidate or create a fresh price below.
    }
  }

  for (const priceId of candidateIds) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.active) {
        await stripe.prices.update(priceId, { active: false });
      }
    } catch {
      // Ignore archive failures for missing or already-inactive prices.
    }
  }

  const created = await stripe.prices.create({
    product: params.productId,
    currency: "gbp",
    unit_amount: params.row.amountGbpPence,
    recurring: { interval: "month" },
    metadata: {
      subscription_plan_key: params.planKey,
      try_on_limit: String(params.row.tryOnLimit),
    },
  });
  return created.id;
}

/**
 * Creates or updates Stripe Products/Prices when Subscription Calc saves plan prices.
 * Stripe Prices are immutable — a new Price is created when the amount changes and the old one is archived.
 */
export async function syncSubscriptionPlanStripePrices(params: {
  catalog: StoredSubscriptionPlanCatalog;
  previous: StoredSubscriptionPlanCatalog | null;
}): Promise<StoredSubscriptionPlanCatalog> {
  const stripe = getStripe();

  const plans = { ...params.catalog.plans };

  for (const planKey of SUBSCRIPTION_PLAN_KEYS_ORDERED) {
    const row = plans[planKey];
    const previousRow = params.previous?.plans[planKey];
    const envPriceId = stripeEnvCatalogSubscriptionPriceId(planKey);

    const productId = await resolveStripeProductId({ planKey, row, envPriceId });
    const desiredProductName = subscriptionProductName(row.name);

    try {
      const product = await stripe.products.retrieve(productId);
      if (product.name !== desiredProductName) {
        await stripe.products.update(productId, { name: desiredProductName });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update Stripe product.";
      throw new Error(`Stripe product sync failed for ${planKey}: ${message}`);
    }

    const priceId = await ensureActiveStripePrice({
      planKey,
      row,
      productId,
      previousRow,
      envPriceId,
    });

    plans[planKey] = {
      ...row,
      stripeProductId: productId,
      stripePriceId: priceId,
    };
  }

  return { ...params.catalog, plans };
}
