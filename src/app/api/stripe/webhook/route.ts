import type Stripe from "stripe";
import { getStripe } from "@/lib/stripeServer";
import {
  claimStripeCheckoutProcessing,
  fulfillCheckoutSessionIfPaid,
  fulfillPaidEnterprisePaymentLinkSession,
  isRetailerPaymentLinkCheckout,
  releaseStripeCheckoutProcessing,
} from "@/lib/stripeFulfillment";

export const runtime = "nodejs";

/**
 * Stripe sends raw body — do not rely on JSON parsing middleware.
 */
export async function POST(req: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set.");
    return Response.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    console.error("[stripe] webhook signature verification failed", e);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === "paid" && isRetailerPaymentLinkCheckout(session)) {
        const claimed = await claimStripeCheckoutProcessing(session.id);
        if (claimed) {
          try {
            await fulfillPaidEnterprisePaymentLinkSession(session);
          } catch (e) {
            await releaseStripeCheckoutProcessing(session.id);
            throw e;
          }
        }
      } else {
        await fulfillCheckoutSessionIfPaid(session);
      }
    }
    return Response.json({ received: true });
  } catch (e) {
    console.error("[stripe] webhook fulfillment error", e);
    return Response.json({ error: "Fulfillment failed." }, { status: 500 });
  }
}
