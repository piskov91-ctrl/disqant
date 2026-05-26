import { getStripe, checkoutSiteOrigin } from "@/lib/stripeServer";
import { getRetailerSessionUser, retailerEligibleForTryOnTopUps } from "@/lib/retailerAuth";
import { loadClientSubscriptionSnapshotWithoutPendingApply } from "@/lib/apiKeyStore";
import { storedOrDerivedBasePlanLimit } from "@/lib/clientTryOnBuckets";
import { maxTopUpPurchasesPerBillingCycleForCatalogBaseLimit } from "@/lib/subscriptionPlans";
import {
  STRIPE_TOP_UP_CHECKOUT_KIND,
  TOP_UP_CUSTOM_MAX_TRY_ONS,
  TOP_UP_CUSTOM_MIN_TRY_ONS,
  customTopUpAmountGbpPence,
  getTopUpPackById,
  parseCustomTopUpTryOns,
  parseTopUpPackId,
  TOP_UP_CUSTOM_PENCE_PER_TRY_ON,
} from "@/lib/topUpPacks";

const CUSTOM_TOP_UP_STRIPE_RATE_LABEL = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
}).format(TOP_UP_CUSTOM_PENCE_PER_TRY_ON / 100);

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawPack =
    typeof body === "object" && body !== null && "pack" in body
      ? (body as { pack: unknown }).pack
      : null;
  const rawCustom =
    typeof body === "object" && body !== null && "customTryOns" in body
      ? (body as { customTryOns: unknown }).customTryOns
      : undefined;

  const customTryOns = parseCustomTopUpTryOns(rawCustom);
  if (rawCustom !== undefined && customTryOns == null) {
    return Response.json(
      {
        error: `Enter a whole number of try-ons between ${TOP_UP_CUSTOM_MIN_TRY_ONS.toLocaleString()} and ${TOP_UP_CUSTOM_MAX_TRY_ONS.toLocaleString()}.`,
      },
      { status: 400 },
    );
  }

  const user = await getRetailerSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!retailerEligibleForTryOnTopUps(user)) {
    return Response.json(
      {
        error:
          "Top-ups are available with an active plan. Visit the Subscriptions page to subscribe or renew.",
      },
      { status: 403 },
    );
  }

  const clientId = user.clientId?.trim() || "";
  if (!clientId) {
    return Response.json({ error: "No API key is linked to this account yet." }, { status: 400 });
  }

  const loaded = await loadClientSubscriptionSnapshotWithoutPendingApply(clientId);
  if (!loaded?.rec || loaded.rec.deletedAt) {
    return Response.json({ error: "Could not load your API key record." }, { status: 400 });
  }
  const snap = loaded.rec;
  const base = storedOrDerivedBasePlanLimit(snap);
  const topUpCap = maxTopUpPurchasesPerBillingCycleForCatalogBaseLimit(base);
  const purchased = snap.topUpsPurchasedThisBillingCycle ?? 0;
  if (topUpCap !== null && purchased >= topUpCap) {
    return Response.json(
      {
        error: `You've reached your plan's limit of ${topUpCap.toLocaleString()} top-up purchases for this billing cycle. More top-ups unlock after your next monthly plan reset.`,
      },
      { status: 403 },
    );
  }

  const origin = checkoutSiteOrigin(req);
  const stripe = getStripe();

  try {
    const stripeCustomerId = user.stripeCustomerId?.trim() || "";

    if (customTryOns != null) {
      const amountPence = customTopUpAmountGbpPence(customTryOns);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: user.email }),
        client_reference_id: user.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: amountPence,
              product_data: {
                name: `Try-on top-up: ${customTryOns.toLocaleString()} try-ons`,
                description: `One-time purchase at ${CUSTOM_TOP_UP_STRIPE_RATE_LABEL} per try-on. Added to your account until fully used (not cleared by monthly plan resets).`,
              },
            },
          },
        ],
        success_url: `${origin}/dashboard?topup=success`,
        cancel_url: `${origin}/dashboard?topup=cancelled`,
        metadata: {
          checkout_kind: STRIPE_TOP_UP_CHECKOUT_KIND,
          retailer_user_id: user.id,
          client_id: clientId,
          top_up_pack: "custom",
          try_on_add: String(customTryOns),
        },
        allow_promotion_codes: true,
      });

      if (!session.url || typeof session.url !== "string") {
        throw new Error("Stripe did not return a checkout URL.");
      }

      return Response.json({ url: session.url });
    }

    const packId = parseTopUpPackId(rawPack);
    if (!packId) {
      return Response.json({ error: "Invalid top-up pack." }, { status: 400 });
    }

    const pack = getTopUpPackById(packId);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: user.email }),
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: pack.amountGbpPence,
            product_data: {
              name: `Try-on top-up: ${pack.tryOns} try-ons`,
              description: "One-time purchase. Added to your account until fully used (not cleared by monthly plan resets).",
            },
          },
        },
      ],
      success_url: `${origin}/dashboard?topup=success`,
      cancel_url: `${origin}/dashboard?topup=cancelled`,
      metadata: {
        checkout_kind: STRIPE_TOP_UP_CHECKOUT_KIND,
        retailer_user_id: user.id,
        client_id: clientId,
        top_up_pack: pack.id,
        try_on_add: String(pack.tryOns),
      },
      allow_promotion_codes: true,
    });

    if (!session.url || typeof session.url !== "string") {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return Response.json({ url: session.url });
  } catch (e) {
    console.error("[stripe] top-up checkout session create failed", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not start checkout." },
      { status: 502 },
    );
  }
}
