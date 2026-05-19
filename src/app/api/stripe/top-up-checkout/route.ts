import { getStripe, checkoutSiteOrigin } from "@/lib/stripeServer";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { STRIPE_TOP_UP_CHECKOUT_KIND, getTopUpPackById, parseTopUpPackId } from "@/lib/topUpPacks";

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
  const packId = parseTopUpPackId(rawPack);
  if (!packId) {
    return Response.json({ error: "Invalid top-up pack." }, { status: 400 });
  }

  const user = await getRetailerSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clientId = user.clientId?.trim() || "";
  if (!clientId) {
    return Response.json({ error: "No API key is linked to this account yet." }, { status: 400 });
  }

  const pack = getTopUpPackById(packId);
  const origin = checkoutSiteOrigin(req);
  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: pack.amountGbpPence,
            product_data: {
              name: `Try-on top-up: ${pack.tryOns} try-ons`,
              description: "One-time purchase. Try-ons are added to your current monthly allowance.",
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
