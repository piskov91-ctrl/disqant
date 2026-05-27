import type Stripe from "stripe";
import {
  createClientKey,
  getRedis,
  incrementClientTryOnLimit,
  loadClientSubscriptionSnapshotWithoutPendingApply,
  mergeClientStripeCheckoutProfileAndQueuePendingSubscription,
  updateClientKey,
} from "@/lib/apiKeyStore";
import { subscriptionPlanCap } from "@/lib/clientTryOnBuckets";
import { attachStripeBillingIds, getRetailerById, linkRetailerToClientId, type RetailerUser } from "@/lib/retailerAuth";
import { getSubscriptionPlanDefinition, parseSubscriptionPlanKey } from "@/lib/subscriptionPlans";
import {
  queueRetailerSubscriptionConfirmationEmail,
  queueRetailerTopUpConfirmationEmail,
  retailerStoreGreetingLabel,
} from "@/lib/retailerStripeConfirmationEmails";
import {
  STRIPE_TOP_UP_CHECKOUT_KIND,
  TOP_UP_CUSTOM_MAX_TRY_ONS,
  TOP_UP_CUSTOM_MIN_TRY_ONS,
  customTopUpAmountGbpPence,
  getTopUpPackById,
  parseTopUpPackId,
} from "@/lib/topUpPacks";

function stripeExpandableId(ref: unknown): string | null {
  if (typeof ref === "string" && ref.length > 0) return ref;
  if (ref && typeof ref === "object" && "id" in ref && typeof (ref as { id: unknown }).id === "string") {
    return (ref as { id: string }).id;
  }
  return null;
}

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
  const packIdRaw = (session.metadata?.top_up_pack ?? "").trim();
  const metaTryOns = parsePositiveInt(session.metadata?.try_on_add ?? undefined);

  if (!retailerUserId || !clientId) {
    console.error("[stripe] top-up checkout session missing fulfillment metadata", {
      sessionId: session.id,
      retailerUserId: retailerUserId || null,
      clientId: clientId || null,
      top_up_pack: packIdRaw || null,
    });
    throw new Error("Invalid Stripe top-up metadata for fulfillment.");
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

  const storeName = user.storeName?.trim() || user.companyName?.trim() || undefined;
  const currency =
    typeof session.currency === "string" && session.currency.trim() ? session.currency : "gbp";

  if (packIdRaw === "custom") {
    if (metaTryOns == null) {
      console.error("[stripe] custom top-up missing try_on_add", { sessionId: session.id });
      throw new Error("Invalid custom top-up metadata.");
    }
    if (
      metaTryOns < TOP_UP_CUSTOM_MIN_TRY_ONS ||
      metaTryOns > TOP_UP_CUSTOM_MAX_TRY_ONS
    ) {
      console.error("[stripe] custom top-up try_on_add out of range", {
        sessionId: session.id,
        metaTryOns,
      });
      throw new Error("Invalid custom top-up size.");
    }

    await incrementClientTryOnLimit(clientId, metaTryOns, {
      amountPaidPence:
        typeof session.amount_total === "number" && Number.isFinite(session.amount_total)
          ? session.amount_total
          : customTopUpAmountGbpPence(metaTryOns),
      currency,
      stripeCheckoutSessionId: session.id,
      storeName,
      packId: "custom",
    });
    queueRetailerTopUpConfirmationEmail(
      user.email,
      retailerStoreGreetingLabel({ storeName: user.storeName, companyName: user.companyName }),
      metaTryOns,
    );
    return;
  }

  const packId = parseTopUpPackId(packIdRaw);
  if (!packId) {
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

  await incrementClientTryOnLimit(clientId, pack.tryOns, {
    amountPaidPence:
      typeof session.amount_total === "number" && Number.isFinite(session.amount_total)
        ? session.amount_total
        : pack.amountGbpPence,
    currency,
    stripeCheckoutSessionId: session.id,
    storeName,
    packId: pack.id,
  });
  queueRetailerTopUpConfirmationEmail(
    user.email,
    retailerStoreGreetingLabel({ storeName: user.storeName, companyName: user.companyName }),
    pack.tryOns,
  );
}

/**
 * Provisions a client API key on first subscribe, reapplies plan caps when the monthly subscription bucket is exhausted,
 * or queues the new plan as pending while the current monthly bucket still has remaining try-ons.
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

  const subscribedAtMs =
    typeof session.created === "number" && Number.isFinite(session.created)
      ? session.created * 1000
      : Date.now();
  const anchorSourceDate = new Date(subscribedAtMs);

  const existingClientId = user.clientId?.trim() ?? "";

  let clientRecord: Awaited<ReturnType<typeof createClientKey>>;

  if (existingClientId) {
    const loaded = await loadClientSubscriptionSnapshotWithoutPendingApply(existingClientId);
    if (!loaded) {
      clientRecord = await createClientKey({
        clientName,
        contactEmail,
        usageLimit: tryOnLimit,
        anchorSourceDate,
      });
    } else {
      const snap = loaded.rec;
      const subscriptionBucketHasRemaining = snap.usageCount < subscriptionPlanCap(snap);

      if (subscriptionBucketHasRemaining) {
        clientRecord = await mergeClientStripeCheckoutProfileAndQueuePendingSubscription({
          id: existingClientId,
          clientName,
          contactEmail,
          pendingTryOnLimit: tryOnLimit,
          pendingPlanKey: planKey,
        });
      } else {
        clientRecord = await updateClientKey({
          id: existingClientId,
          clientName,
          contactEmail,
          monthlyPlanLimit: tryOnLimit,
          topUpLimit: Math.floor(snap.topUpLimit ?? 0),
        });
      }
    }
  } else {
    clientRecord = await createClientKey({
      clientName,
      contactEmail,
      usageLimit: tryOnLimit,
      anchorSourceDate,
    });
  }

  await linkRetailerToClientId(user.id, clientRecord.id);

  const stripeSubscriptionId = stripeExpandableId(session.subscription);
  const stripeCustomerId = stripeExpandableId(session.customer);

  await attachStripeBillingIds(user.id, {
    ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
    clearSubscriptionCancellationSchedule: true,
  });

  const planDef = getSubscriptionPlanDefinition(planKey);
  queueRetailerSubscriptionConfirmationEmail(
    contactEmail,
    retailerStoreGreetingLabel({ storeName: user.storeName, companyName: user.companyName }),
    planDef.name,
    planDef.tryOnLimit,
  );
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
