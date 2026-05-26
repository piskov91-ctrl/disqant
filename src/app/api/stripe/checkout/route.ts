import { checkoutSiteOrigin, getStripe } from "@/lib/stripeServer";
import {
  SUBSCRIPTION_PLANS,
  parseSubscriptionPlanKey,
  stripeCatalogSubscriptionPriceId,
} from "@/lib/subscriptionPlans";
import { getRetailerSessionUser } from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function createCheckoutSessionUrl(params: { req: Request; planKey: keyof typeof SUBSCRIPTION_PLANS }) {
  const user = await getRetailerSessionUser();
  if (!user) return { kind: "unauthorized" as const };

  const def = SUBSCRIPTION_PLANS[params.planKey];
  const stripe = getStripe();
  const origin = checkoutSiteOrigin(params.req);

  /** Exactly one recurring line — base subscription plan only (never bundle top-ups here). */
  const catalogPriceId = stripeCatalogSubscriptionPriceId(params.planKey);
  const subscriptionLineItems = catalogPriceId
    ? [{ price: catalogPriceId, quantity: 1 as const }]
    : [
        {
          quantity: 1 as const,
          price_data: {
            currency: "gbp" as const,
            unit_amount: def.amountGbpPence,
            recurring: { interval: "month" as const },
            product_data: {
              name: def.name,
            },
          },
        },
      ];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: subscriptionLineItems,
    success_url: `${origin}/dashboard?tab=get-code`,
    cancel_url: `${origin}/subscriptions?checkout=cancelled`,
    metadata: {
      retailer_user_id: user.id,
      plan: params.planKey,
      usage_limit: String(def.tryOnLimit),
    },
    subscription_data: {
      metadata: {
        retailer_user_id: user.id,
        plan: params.planKey,
        usage_limit: String(def.tryOnLimit),
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url || typeof session.url !== "string") {
    throw new Error("Stripe did not return a checkout URL.");
  }
  return { kind: "ok" as const, url: session.url };
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const planKey = parseSubscriptionPlanKey(u.searchParams.get("plan"));
  if (!planKey) {
    return Response.json({ error: "Invalid subscription plan." }, { status: 400 });
  }

  try {
    const res = await createCheckoutSessionUrl({ req, planKey });
    if (res.kind === "unauthorized") {
      return Response.redirect("/login?next=/subscriptions", 303);
    }
    return Response.redirect(res.url, 303);
  } catch (e) {
    console.error("[stripe] checkout session create failed", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not start checkout." },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawPlan =
    typeof body === "object" && body !== null && "plan" in body
      ? (body as { plan: unknown }).plan
      : null;
  const planKey = parseSubscriptionPlanKey(rawPlan);
  if (!planKey) {
    return Response.json({ error: "Invalid subscription plan." }, { status: 400 });
  }

  try {
    const res = await createCheckoutSessionUrl({ req, planKey });
    if (res.kind === "unauthorized") {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    return Response.json({ url: res.url });
  } catch (e) {
    console.error("[stripe] checkout session create failed", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not start checkout." },
      { status: 502 },
    );
  }
}
