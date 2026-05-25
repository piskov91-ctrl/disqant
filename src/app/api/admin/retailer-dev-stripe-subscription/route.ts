import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import {
  ADMIN_TEST_STRIPE_SUBSCRIPTION_ID,
  applyRetailStripeSubscriptionIdAdminOverride,
  listRetailersLinkedToClientId,
} from "@/lib/retailerAuth";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

type Body = {
  clientId?: unknown;
  action?: unknown;
  stripeSubscriptionId?: unknown;
};

/**
 * ADMIN ONLY — sets/clears a synthetic `stripeSubscriptionId` on the retailer Redis record linked to a client API key,
 * plus clears cancel-scheduling metadata, so retailer top-up UX can be tested without subscribing in Stripe first.
 *
 * Stripe Checkout launched from `/api/stripe/top-up-checkout` is still live billing (test mode follows env keys).
 */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const clientId = typeof raw.clientId === "string" ? raw.clientId.trim() : "";
  const action = typeof raw.action === "string" ? raw.action.trim() : "";

  if (!clientId) {
    return Response.json({ error: "Missing client id." }, { status: 400 });
  }

  const client = await getClientKeyRecordById(clientId);
  if (!client) {
    return Response.json({ error: "Client not found." }, { status: 404 });
  }

  const retailers = await listRetailersLinkedToClientId(clientId);
  if (retailers.length === 0) {
    return Response.json(
      {
        error:
          "No retailer dashboard login is linked to this client id (their `clientId` must equal this API key record).",
      },
      { status: 404 },
    );
  }
  if (retailers.length > 1) {
    return Response.json(
      {
        error:
          "Several retailer accounts reference this API key record. Pick which user receives the Stripe id in Redis manually, or unlink extras before using this shortcut.",
        retailers: retailers.map((r) => ({ userId: r.userId, email: r.email, storeName: r.storeName })),
      },
      { status: 409 },
    );
  }

  const retailerUserId = retailers[0].userId;

  try {
    if (action === "set_test") {
      await applyRetailStripeSubscriptionIdAdminOverride({
        retailerUserId,
        stripeSubscriptionId: ADMIN_TEST_STRIPE_SUBSCRIPTION_ID,
      });
      return Response.json({
        ok: true as const,
        retailerUserId,
        stripeSubscriptionId: ADMIN_TEST_STRIPE_SUBSCRIPTION_ID,
        message:
          `Stored sandbox subscription id (${ADMIN_TEST_STRIPE_SUBSCRIPTION_ID}) plus cleared cancellation metadata on retailer record.`,
      });
    }

    if (action === "set_custom") {
      const custom =
        typeof raw.stripeSubscriptionId === "string" ? raw.stripeSubscriptionId.trim() : "";
      if (!custom || custom.length > 240) {
        return Response.json({ error: "Enter a Stripe subscription id (max 240 characters)." }, { status: 400 });
      }
      await applyRetailStripeSubscriptionIdAdminOverride({
        retailerUserId,
        stripeSubscriptionId: custom,
      });
      return Response.json({
        ok: true as const,
        retailerUserId,
        stripeSubscriptionId: custom,
        message: `Stored subscription id (${custom.slice(0, 16)}…) plus cleared cancellation metadata on retailer record.`,
      });
    }

    if (action === "clear") {
      await applyRetailStripeSubscriptionIdAdminOverride({
        retailerUserId,
        stripeSubscriptionId: null,
      });
      return Response.json({
        ok: true as const,
        retailerUserId,
        stripeSubscriptionId: null,
        message: "Cleared stored Stripe subscription id and cancellation metadata.",
      });
    }

    return Response.json(
      { error: 'Invalid action. Use "set_test", "set_custom", or "clear".' },
      { status: 400 },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not apply override." },
      { status: 502 },
    );
  }
}
