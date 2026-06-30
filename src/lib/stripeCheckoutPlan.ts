import type Stripe from "stripe";
import { getStripe } from "@/lib/stripeServer";
import { parseSubscriptionPlanKey } from "@/lib/subscriptionPlans";
import type { SubscriptionPlanKey } from "@/lib/subscriptionPlansData";
import {
  buildSubscriptionPriceIdToPlanMap,
  stripeCatalogSubscriptionPriceId,
} from "@/lib/subscriptionPlansServer";

function stripePriceIdFromRef(price: string | { id: string } | null | undefined): string | null {
  if (typeof price === "string" && price.trim().length > 0) return price.trim();
  if (price && typeof price === "object" && typeof price.id === "string" && price.id.trim().length > 0) {
    return price.id.trim();
  }
  return null;
}

function priceIdsFromLineItems(lineItems: Stripe.ApiList<Stripe.LineItem> | null | undefined): string[] {
  const rows = lineItems?.data ?? [];
  const out: string[] = [];
  for (const item of rows) {
    const priceId = stripePriceIdFromRef(item.price);
    if (priceId) out.push(priceId);
  }
  return out;
}

/** Collect recurring Price IDs from a Checkout Session (fetches line items when omitted on the webhook payload). */
export async function checkoutSessionStripePriceIds(session: Stripe.Checkout.Session): Promise<string[]> {
  const fromPayload = priceIdsFromLineItems(session.line_items);
  if (fromPayload.length > 0) return fromPayload;

  const stripe = getStripe();
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price"],
  });
  return priceIdsFromLineItems(full.line_items);
}

/**
 * Resolve catalog plan from Checkout Session metadata or line-item Price IDs.
 * Price IDs are matched against live env vars first in production (`sk_live_`), then Redis-synced IDs.
 */
export async function resolvePlanKeyFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<SubscriptionPlanKey | null> {
  const fromMeta = parseSubscriptionPlanKey(session.metadata?.plan ?? "");
  if (fromMeta) return fromMeta;

  const priceMap = await buildSubscriptionPriceIdToPlanMap();
  for (const priceId of await checkoutSessionStripePriceIds(session)) {
    const plan = priceMap.get(priceId);
    if (plan) return plan;
  }

  return null;
}

/** Logged during webhook fulfillment to trace live vs test price mismatches. */
export async function describeCheckoutSessionPriceResolution(session: Stripe.Checkout.Session): Promise<{
  metadataPlan: string | null;
  resolvedPlan: SubscriptionPlanKey | null;
  lineItemPriceIds: string[];
  envPriceIds: Partial<Record<SubscriptionPlanKey, string>>;
}> {
  const lineItemPriceIds = await checkoutSessionStripePriceIds(session);
  const resolvedPlan = await resolvePlanKeyFromCheckoutSession(session);
  const envPriceIds: Partial<Record<SubscriptionPlanKey, string>> = {};
  for (const key of ["starter", "boutique", "studio", "premium"] as const) {
    const id = stripeCatalogSubscriptionPriceId(key);
    if (id) envPriceIds[key] = id;
  }
  return {
    metadataPlan: typeof session.metadata?.plan === "string" ? session.metadata.plan : null,
    resolvedPlan,
    lineItemPriceIds,
    envPriceIds,
  };
}
