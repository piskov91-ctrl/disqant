import type Stripe from "stripe";
import { getStripe, isStripeLiveMode } from "@/lib/stripeServer";
import type { StoredSubscriptionPlanCatalog } from "@/lib/subscriptionPlanCatalogStore";
import { stripeCatalogSubscriptionPriceId } from "@/lib/subscriptionPlansServer";
import {
  parseSubscriptionPlanKey,
  SUBSCRIPTION_PLAN_KEYS_ORDERED,
  type SubscriptionPlanKey,
} from "@/lib/subscriptionPlansData";

const SUBSCRIPTION_MIGRATION_STATUSES: Stripe.SubscriptionListParams["status"][] = [
  "active",
  "trialing",
  "past_due",
];

function stripeEnvCatalogSubscriptionPriceId(planKey: SubscriptionPlanKey): string | undefined {
  return stripeCatalogSubscriptionPriceId(planKey);
}

function stripeProductIdFromRef(product: string | { id: string } | null | undefined): string | null {
  if (typeof product === "string" && product.trim().length > 0) return product.trim();
  if (product && typeof product === "object" && typeof product.id === "string" && product.id.trim().length > 0) {
    return product.id;
  }
  return null;
}

function stripePriceIdFromRef(price: string | { id: string } | null | undefined): string | null {
  if (typeof price === "string" && price.trim().length > 0) return price.trim();
  if (price && typeof price === "object" && typeof price.id === "string" && price.id.trim().length > 0) {
    return price.id.trim();
  }
  return null;
}

function subscriptionProductName(planName: string): string {
  const trimmed = planName.trim();
  return trimmed.length > 0 ? `${trimmed} — Wear Me subscription` : "Wear Me subscription";
}

function subscriptionPlanKeyFromMetadata(metadata: Stripe.Metadata | null | undefined): SubscriptionPlanKey | null {
  const raw = metadata?.plan;
  if (typeof raw !== "string") return null;
  return parseSubscriptionPlanKey(raw);
}

export type SubscriptionPlanMigrationSummary = {
  planKey: SubscriptionPlanKey;
  newPriceId: string;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
};

export type SubscriptionPlanStripeSyncResult = {
  catalog: StoredSubscriptionPlanCatalog;
  subscriptionMigrations: SubscriptionPlanMigrationSummary[];
};

type PriceSyncResult = {
  priceId: string;
  priceChanged: boolean;
  supersededPriceIds: string[];
};

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
}): Promise<PriceSyncResult> {
  const stripe = getStripe();
  const envPriceId = params.envPriceId?.trim();
  const candidateIds = isStripeLiveMode()
    ? [
        envPriceId,
        params.row.stripePriceId?.trim(),
        params.previousRow?.stripePriceId?.trim(),
      ].filter((id): id is string => Boolean(id))
    : [
        params.row.stripePriceId?.trim(),
        params.previousRow?.stripePriceId?.trim(),
        envPriceId,
      ].filter((id): id is string => Boolean(id));

  for (const priceId of candidateIds) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.unit_amount === params.row.amountGbpPence && price.active) {
        return { priceId: price.id, priceChanged: false, supersededPriceIds: [] };
      }
    } catch {
      // Try next candidate or create a fresh price below.
    }
  }

  const supersededPriceIds = [...new Set(candidateIds)];

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

  return { priceId: created.id, priceChanged: true, supersededPriceIds };
}

function subscriptionMatchesPlan(params: {
  subscription: Stripe.Subscription;
  planKey: SubscriptionPlanKey;
  matchPriceIds: Set<string>;
}): boolean {
  const metadataPlan = subscriptionPlanKeyFromMetadata(params.subscription.metadata);
  if (metadataPlan === params.planKey) return true;

  for (const item of params.subscription.items.data) {
    const priceId = stripePriceIdFromRef(item.price);
    if (priceId && params.matchPriceIds.has(priceId)) return true;
  }

  return false;
}

async function forEachMigratableSubscription(
  fn: (subscription: Stripe.Subscription) => Promise<void>,
): Promise<void> {
  const stripe = getStripe();

  for (const status of SUBSCRIPTION_MIGRATION_STATUSES) {
    let startingAfter: string | undefined;
    for (;;) {
      const page = await stripe.subscriptions.list({
        status,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const subscription of page.data) {
        await fn(subscription);
      }

      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
    }
  }
}

/**
 * Point active catalog subscriptions at the new Price with no proration — the new amount applies on the next renewal.
 */
async function migrateActiveSubscriptionsToNewPrice(params: {
  planKey: SubscriptionPlanKey;
  newPriceId: string;
  matchPriceIds: Set<string>;
  tryOnLimit: number;
}): Promise<SubscriptionPlanMigrationSummary> {
  const stripe = getStripe();
  const summary: SubscriptionPlanMigrationSummary = {
    planKey: params.planKey,
    newPriceId: params.newPriceId,
    updatedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  await forEachMigratableSubscription(async (subscription) => {
    if (!subscriptionMatchesPlan({ subscription, planKey: params.planKey, matchPriceIds: params.matchPriceIds })) {
      return;
    }

    const primaryItem = subscription.items.data[0];
    if (!primaryItem?.id) {
      summary.skippedCount += 1;
      return;
    }

    const currentPriceId = stripePriceIdFromRef(primaryItem.price);
    if (currentPriceId === params.newPriceId) {
      summary.skippedCount += 1;
      return;
    }

    try {
      await stripe.subscriptions.update(subscription.id, {
        items: [{ id: primaryItem.id, price: params.newPriceId }],
        proration_behavior: "none",
        metadata: {
          ...subscription.metadata,
          plan: params.planKey,
          usage_limit: String(params.tryOnLimit),
        },
      });
      summary.updatedCount += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Stripe subscription update failed.";
      summary.errors.push(`${subscription.id}: ${message}`);
    }
  });

  return summary;
}

/**
 * Creates or updates Stripe Products/Prices when Subscription Calc saves plan prices.
 * When a price changes, active subscriptions on that plan are scheduled to use the new Price at their next renewal.
 */
export async function syncSubscriptionPlanStripePrices(params: {
  catalog: StoredSubscriptionPlanCatalog;
  previous: StoredSubscriptionPlanCatalog | null;
}): Promise<SubscriptionPlanStripeSyncResult> {
  const stripe = getStripe();
  const plans = { ...params.catalog.plans };
  const subscriptionMigrations: SubscriptionPlanMigrationSummary[] = [];

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

    const { priceId, priceChanged, supersededPriceIds } = await ensureActiveStripePrice({
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

    if (priceChanged) {
      const matchPriceIds = new Set<string>([
        ...supersededPriceIds,
        previousRow?.stripePriceId?.trim(),
        envPriceId?.trim(),
      ].filter((id): id is string => Boolean(id)));

      const migration = await migrateActiveSubscriptionsToNewPrice({
        planKey,
        newPriceId: priceId,
        matchPriceIds,
        tryOnLimit: row.tryOnLimit,
      });
      subscriptionMigrations.push(migration);
    }
  }

  return { catalog: { ...params.catalog, plans }, subscriptionMigrations };
}
