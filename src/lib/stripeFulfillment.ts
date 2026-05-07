import type Stripe from "stripe";
import {
  createClientKey,
  getRedis,
} from "@/lib/apiKeyStore";
import { getRetailerById, linkRetailerToClientId, type RetailerUser } from "@/lib/retailerAuth";
import { getSubscriptionPlanDefinition, parseSubscriptionPlanKey } from "@/lib/subscriptionPlans";

function idempotencyRedisKey(checkoutSessionId: string): string {
  return `fit-room:stripe:checkout-done:${checkoutSessionId}`;
}

/**
 * Provisions or upgrades the billing client API key after a paid subscription checkout.
 * Idempotency lock must be claimed by the webhook handler before calling.
 */
async function fulfillPaidSubscriptionCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const planRaw = session.metadata?.plan ?? "";
  const planKey = parseSubscriptionPlanKey(planRaw);
  const retailerUserId = (session.metadata?.retailer_user_id ?? session.client_reference_id ?? "").trim();

  if (!retailerUserId || !planKey) {
    console.error("[stripe] checkout session missing valid fulfillment metadata", {
      sessionId: session.id,
      retailerUserId: retailerUserId || null,
      plan: planRaw || null,
    });
    throw new Error("Invalid Stripe checkout metadata for fulfillment.");
  }

  const { tryOnLimit } = getSubscriptionPlanDefinition(planKey);

  const user = await findRetailerIdentityForStripeSession(retailerUserId);
  if (!user) {
    console.error("[stripe] retailer user not found for checkout", {
      sessionId: session.id,
      retailerUserId,
    });
    throw new Error("Retailer account not found for Stripe checkout.");
  }

  const clientName = (
    user.storeName?.trim() ||
    user.companyName?.trim() ||
    "Store"
  ).slice(0, 200);

  const contactEmail = user.email.trim();

  // Always provision a brand-new client key on paid checkout, even if the account had an older key.
  // This ensures each paying customer gets a unique API key and avoids accidentally reusing any shared/demo key.
  const rec = await createClientKey({
    clientName,
    contactEmail,
    usageLimit: tryOnLimit,
  });

  await linkRetailerToClientId(user.id, rec.id);
}

async function findRetailerIdentityForStripeSession(retailerUserId: string): Promise<RetailerUser | null> {
  return getRetailerById(retailerUserId.trim());
}

/**
 * Claim-once lock: returns true if this worker should run fulfillment; false if duplicate event.
 * On failure after returning true, caller should release the lock.
 */
export async function claimStripeCheckoutProcessing(sessionId: string): Promise<boolean> {
  const redis = getRedis();
  const key = idempotencyRedisKey(sessionId);
  const res = await redis.set(key, "1", { nx: true, ex: 60 * 60 * 24 * 90 });
  /** Upstash: `null` when NX fails (already processing or done). */
  return res != null;
}

export async function releaseStripeCheckoutProcessing(sessionId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(idempotencyRedisKey(sessionId));
}

export async function fulfillCheckoutSessionIfPaid(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription") return;
  if (session.payment_status !== "paid") return;

  const claimed = await claimStripeCheckoutProcessing(session.id);
  if (!claimed) return;

  try {
    await fulfillPaidSubscriptionCheckoutSession(session);
  } catch (e) {
    await releaseStripeCheckoutProcessing(session.id);
    throw e;
  }
}
