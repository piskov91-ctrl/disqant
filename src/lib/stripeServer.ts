import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function stripeSecretKey(): string {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
  return secret;
}

/** True when `STRIPE_SECRET_KEY` is a live secret (`sk_live_…`). */
export function isStripeLiveMode(): boolean {
  return stripeSecretKey().startsWith("sk_live_");
}

export function getStripe(): Stripe {
  const secret = stripeSecretKey();
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secret, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function checkoutSiteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  try {
    return new URL(req.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}
