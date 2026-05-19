import {
  getRetailerSessionUser,
  persistSubscriptionCancellationSchedule,
} from "@/lib/retailerAuth";
import { isFitRoomEmailConfigured, sendFitRoomPlainTextMail } from "@/lib/fitRoomEmail";
import {
  parseSubscriptionCancellationPayload,
  SUBSCRIPTION_CANCELLATION_REASON_LABELS,
} from "@/lib/subscriptionCancellation";
import {
  findCancellableStripeSubscription,
  scheduleStripeSubscriptionCancelAtPeriodEnd,
} from "@/lib/stripeSubscriptionCancel";

export const runtime = "nodejs";

const SUPPORT_INBOX = "support@fit-room.com";

export async function POST(req: Request): Promise<Response> {
  const user = await getRetailerSessionUser();
  if (!user) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = parseSubscriptionCancellationPayload(body);
  if (!parsed) {
    return Response.json({ error: "Invalid cancellation payload." }, { status: 400 });
  }

  if (user.subscriptionCanceledAt?.trim()) {
    return Response.json({
      ok: true,
      alreadyRecorded: true,
      accessUntil: user.subscriptionAccessUntil ?? null,
      canceledAt: user.subscriptionCanceledAt,
    });
  }

  const resolved = await findCancellableStripeSubscription(user);
  if (!resolved) {
    return Response.json(
      {
        error:
          "No active Stripe subscription found for this account. Please email support@fit-room.com and we will help you cancel.",
      },
      { status: 404 },
    );
  }

  const { subscription: subBefore, customerId } = resolved;

  const updated = subBefore.cancel_at_period_end
    ? subBefore
    : await scheduleStripeSubscriptionCancelAtPeriodEnd(subBefore.id);

  const accessUntilIso = new Date(updated.current_period_end * 1000).toISOString();
  const canceledAtIso = new Date().toISOString();

  await persistSubscriptionCancellationSchedule({
    retailerUserId: user.id,
    subscriptionAccessUntil: accessUntilIso,
    subscriptionCanceledAt: canceledAtIso,
    stripeSubscriptionId: updated.id,
    stripeCustomerId: customerId,
    cancellationReason: parsed.reason,
    cancellationComments: parsed.comments,
  });

  const reasonLabel = SUBSCRIPTION_CANCELLATION_REASON_LABELS[parsed.reason];
  const storeLabel = user.storeName?.trim() || user.companyName?.trim() || "Store";

  const resetLine = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(accessUntilIso));

  const clientLines = [
    `Hi,`,
    ``,
    `We've received your request to cancel your Fit Room subscription for ${storeLabel}.`,
    ``,
    `Your plan stays active with full access until ${resetLine} (UTC), through the end of your current Stripe billing period. You will not be charged again for this subscription after that date.`,
    ``,
    `Reason you selected: ${reasonLabel}`,
    parsed.comments ? `Additional comments: ${parsed.comments}` : null,
    ``,
    `Thank you for trying Fit Room.`,
    ``,
    `— Fit Room`,
  ].filter(Boolean) as string[];

  const supportLines = [
    `[Fit Room] Subscription cancellation`,
    ``,
    `Store: ${storeLabel}`,
    `Email: ${user.email}`,
    `User id: ${user.id}`,
    `Client id: ${user.clientId ?? "—"}`,
    `Stripe subscription: ${updated.id}`,
    `Stripe customer: ${customerId}`,
    `Access until (UTC): ${accessUntilIso}`,
    ``,
    `Reason: ${reasonLabel} (${parsed.reason})`,
    parsed.comments ? `Comments: ${parsed.comments}` : "Comments: (none)",
  ];

  if (isFitRoomEmailConfigured()) {
    try {
      await sendFitRoomPlainTextMail({
        to: user.email.trim(),
        subject: "Fit Room — subscription cancellation confirmed",
        text: clientLines.join("\n"),
      });
    } catch (e) {
      console.error("[stripe] cancellation retailer confirmation email failed", e);
    }
    try {
      await sendFitRoomPlainTextMail({
        to: SUPPORT_INBOX,
        subject: `[Fit Room] Cancellation — ${storeLabel} (${user.email})`,
        text: supportLines.join("\n"),
      });
    } catch (e) {
      console.error("[stripe] cancellation support notification email failed", e);
    }
  } else {
    console.warn("[stripe] RESEND_API_KEY not set; skipping cancellation emails.");
  }

  return Response.json({
    ok: true,
    accessUntil: accessUntilIso,
    canceledAt: canceledAtIso,
  });
}
