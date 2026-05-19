import type Stripe from "stripe";
import {
  createClientKey,
  getRedis,
  incrementClientTryOnLimit,
} from "@/lib/apiKeyStore";
import { getRetailerById, linkRetailerToClientId, type RetailerUser } from "@/lib/retailerAuth";
import { getSubscriptionPlanDefinition, parseSubscriptionPlanKey } from "@/lib/subscriptionPlans";
import { STRIPE_TOP_UP_CHECKOUT_KIND, getTopUpPackById, parseTopUpPackId } from "@/lib/topUpPacks";

function idempotencyRedisKey(checkoutSessionId: string): string {
  return `fit-room:stripe:checkout-done:${checkoutSessionId}`;
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (raw == null || typeof raw !== "string") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function fulfillPaidTopUpCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const retailerUserId = (session.metadata?.retailer_user_id ?? session.client_reference_id ?? "").trim();
  const clientId = (session.metadata?.client_id ?? "").trim();
  const packIdRaw = session.metadata?.top_up_pack ?? "";
  const packId = parseTopUpPackId(packIdRaw);
  const metaTryOns = parsePositiveInt(session.metadata?.try_on_add ?? undefined);

  if (!retailerUserId || !clientId || !packId) {
    console.error("[stripe] top-up checkout session missing fulfillment metadata", {
      sessionId: session.id,
      retailerUserId: retailerUserId || null,
      clientId: clientId || null,
      top_up_pack: packIdRaw || null,
    });
    throw new Error("Invalid Stripe top-up metadata for fulfillment.");
  }

  const pack = getTopUpPackById(packId);
  if (metaTryOns != null && metaTryOns !== pack.tryOns) {
    console.error("[stripe] top-up try_on_add mismatch", {
      sessionId: session.id,
      metaTryOns,
      packTryOns: pack.tryOns,
    });
    throw new Error("Top-up pack mismatch.");
  }

  const user = await findRetailerIdentityForStripeSession(retailerUserId);
  if (!user) {
    console.error("[stripe] retailer user not found for top-up checkout", {
      sessionId: session.id,
      retailerUserId,
    });
    throw new Error("Retailer account not found for Stripe top-up.");
  }

  const linked = user.clientId?.trim() || "";
  if (linked !== clientId) {
    console.error("[stripe] top-up client_id does not match retailer linkage", {
      sessionId: session.id,
      retailerUserId,
      metadataClientId: clientId,
      linkedClientId: linked || null,
    });
    throw new Error("Top-up client does not match this account.");
  }

  await incrementClientTryOnLimit(clientId, pack.tryOns, {
    amountPaidPence:
      typeof session.amount_total === "number" && Number.isFinite(session.amount_total)
        ? session.amount_total
        : pack.amountGbpPence,
    currency: typeof session.currency === "string" && session.currency.trim() ? session.currency : "gbp",
    stripeCheckoutSessionId: session.id,
    storeName:
      user.storeName?.trim() ||
      user.companyName?.trim() ||
      undefined,
    packId: pack.id,
  });
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
  const subscribedAtMs =
    typeof session.created === "number" && Number.isFinite(session.created)
      ? session.created * 1000
      : Date.now();
  const anchorSourceDate = new Date(subscribedAtMs);

  const rec = await createClientKey({
    clientName,
    contactEmail,
    usageLimit: tryOnLimit,
    anchorSourceDate,
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
  if (session.payment_status !== "paid") return;

  const isTopUp = session.metadata?.checkout_kind === STRIPE_TOP_UP_CHECKOUT_KIND;
  if (isTopUp) {
    if (session.mode !== "payment") {
      console.error("[stripe] top-up checkout has unexpected mode", { sessionId: session.id, mode: session.mode });
      return;
    }
    const claimed = await claimStripeCheckoutProcessing(session.id);
    if (!claimed) return;
    try {
      await fulfillPaidTopUpCheckoutSession(session);
    } catch (e) {
      await releaseStripeCheckoutProcessing(session.id);
      throw e;
    }
    return;
  }

  if (session.mode !== "subscription") return;

  const claimed = await claimStripeCheckoutProcessing(session.id);
  if (!claimed) return;

  try {
    await fulfillPaidSubscriptionCheckoutSession(session);
  } catch (e) {
    await releaseStripeCheckoutProcessing(session.id);
    throw e;
  }
}
