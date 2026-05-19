import type Stripe from "stripe";
import { getStripe } from "@/lib/stripeServer";
import type { RetailerUser } from "@/lib/retailerAuth";

const ACTIVE_LIKE = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

/**
 * Resolves a Stripe subscription the retailer can cancel: prefers stored id, then customer email lookup.
 */
export async function findCancellableStripeSubscription(
  user: RetailerUser,
): Promise<{ subscription: Stripe.Subscription; customerId: string } | null> {
  const stripe = getStripe();

  async function trySub(subId: string): Promise<{ subscription: Stripe.Subscription; customerId: string } | null> {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      if (!ACTIVE_LIKE.has(sub.status)) return null;
      const customerId =
        typeof sub.customer === "string"
          ? sub.customer
          : sub.customer && typeof sub.customer === "object" && "id" in sub.customer
            ? String((sub.customer as { id: string }).id)
            : "";
      if (!customerId) return null;
      return { subscription: sub, customerId };
    } catch {
      return null;
    }
  }

  const stored = user.stripeSubscriptionId?.trim();
  if (stored) {
    const hit = await trySub(stored);
    if (hit) return hit;
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  const customers = await stripe.customers.list({ email, limit: 15 });
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 30 });
    for (const sub of subs.data) {
      if (!ACTIVE_LIKE.has(sub.status)) continue;
      return { subscription: sub, customerId: c.id };
    }
  }

  return null;
}

/**
 * Stops future renewal charges; current paid period remains active in Stripe until {@link Stripe.Subscription.current_period_end}.
 */
export async function scheduleStripeSubscriptionCancelAtPeriodEnd(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}
