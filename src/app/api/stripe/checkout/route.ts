import { getStripe, checkoutSiteOrigin } from "@/lib/stripeServer";
import { SUBSCRIPTION_PLANS, parseSubscriptionPlanKey } from "@/lib/subscriptionPlans";
import { getRetailerSessionUser } from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function createCheckoutSessionUrl(params: { req: Request; planKey: keyof typeof SUBSCRIPTION_PLANS }) {
  const user = await getRetailerSessionUser();
  if (!user) return { kind: "unauthorized" as const };

  const def = SUBSCRIPTION_PLANS[params.planKey];
  const stripe = getStripe();
  const origin = checkoutSiteOrigin(params.req);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: def.amountGbpPence,
          recurring: { interval: "month" },
          product_data: {
            name: def.name,
          },
        },
      },
    ],
    success_url: `${origin}/subscriptions?checkout=success`,
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

  if (!session.url) {
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
      const origin = checkoutSiteOrigin(req);
      return Response.redirect(`${origin}/login?next=/subscriptions`, 303);
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
