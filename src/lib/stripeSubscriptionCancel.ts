import type Stripe from "stripe";
import { getStripe } from "@/lib/stripeServer";
import type { RetailerUser } from "@/lib/retailerAuth";

const ACTIVE_LIKE = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

async function tryRetrieveActiveLikeSubscription(
  stripe: ReturnType<typeof getStripe>,
  subId: string,
): Promise<{ subscription: Stripe.Subscription; customerId: string } | null> {
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

async function customerEmailMatchesRetailer(
  stripe: ReturnType<typeof getStripe>,
  customerId: string,
  user: RetailerUser,
): Promise<boolean> {
  try {
    const c = await stripe.customers.retrieve(customerId);
    if (typeof c === "object" && c && "deleted" in c && (c as { deleted?: boolean }).deleted) return false;
    const em =
      typeof c === "object" && c && "email" in c
        ? String((c as { email?: string | null }).email ?? "").trim().toLowerCase()
        : "";
    return em.length > 0 && em === user.email.trim().toLowerCase();
  } catch {
    return false;
  }
}

async function subscriptionBelongsToRetailer(
  stripe: ReturnType<typeof getStripe>,
  sub: Stripe.Subscription,
  customerId: string,
  user: RetailerUser,
): Promise<boolean> {
  if (user.stripeSubscriptionId?.trim() === sub.id) return true;
  const storedCust = user.stripeCustomerId?.trim();
  if (storedCust && storedCust === customerId) return true;
  return customerEmailMatchesRetailer(stripe, customerId, user);
}

/**
 * Resolves which Stripe subscription to cancel-at-period-end. When `requestedSubscriptionId` is set, it must be an
 * active-like subscription belonging to this retailer; otherwise falls back to
 * {@link findCancellableStripeSubscription}.
 */
export async function resolveStripeSubscriptionForRetailCancel(
  user: RetailerUser,
  requestedSubscriptionId?: string | null,
): Promise<{ subscription: Stripe.Subscription; customerId: string } | null> {
  const stripe = getStripe();
  const req = requestedSubscriptionId?.trim() || "";
  if (req) {
    const hit = await tryRetrieveActiveLikeSubscription(stripe, req);
    if (!hit) return null;
    if (!(await subscriptionBelongsToRetailer(stripe, hit.subscription, hit.customerId, user))) return null;
    return hit;
  }

  return findCancellableStripeSubscription(user);
}

/**
 * Resolves a Stripe subscription the retailer can cancel: prefers stored id, then customer email lookup.
 */
export async function findCancellableStripeSubscription(
  user: RetailerUser,
): Promise<{ subscription: Stripe.Subscription; customerId: string } | null> {
  const stripe = getStripe();

  const stored = user.stripeSubscriptionId?.trim();
  if (stored) {
    const hit = await tryRetrieveActiveLikeSubscription(stripe, stored);
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
