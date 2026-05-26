import {
  getRetailerSessionUser,
  persistSubscriptionCancellationSchedule,
} from "@/lib/retailerAuth";
import { clearPendingSubscriptionPlanOnClient } from "@/lib/apiKeyStore";
import { isFitRoomEmailConfigured, sendFitRoomPlainTextMail } from "@/lib/fitRoomEmail";
import {
  transactionalParagraph,
  transactionalSnippetBlock,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";
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

  if (parsed.clearPendingPlan && user.clientId?.trim()) {
    try {
      await clearPendingSubscriptionPlanOnClient(user.clientId.trim());
    } catch (e) {
      console.error("[stripe] cancellation clear pending plan failed", e);
    }
  }

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
    `Thank you for the straight story — we've recorded the Fit Room cancellation for ${storeLabel}.`,
    ``,
    `Stripe keeps your toolkit wide open through ${resetLine} (UTC, end of your current billing lap). Billing pauses afterward; nobody sneaks another charge on this subscription.`,
    ``,
    `Reason captured: ${reasonLabel}`,
    parsed.comments ? `What you scribbled separately: ${parsed.comments}` : null,
    ``,
    `If you drift back someday, we'd love to host you again. Until then breathe easy.`,
    ``,
    `Warmly,`,
    `Fit Room`,
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
      const clientHtml = wrapFitRoomTransactionalHtml({
        documentTitle: "Subscription cancelled",
        preheader: `Access continues through ${resetLine} UTC.`,
        heading: "Consider this confirmation",
        innerHtml:
          transactionalParagraph("Hi,") +
          transactionalParagraph(`Thanks for the straight story — we've logged the Fit Room cancellation for ${storeLabel}.`) +
          transactionalParagraph(
            `Stripe keeps lights on until ${resetLine} (UTC — basically the runway of your billing lap). After that the subscription winds down cleanly; there's no phantom renewal.`,
          ) +
          transactionalParagraph(`Reason you chose: ${reasonLabel}.`) +
          (parsed.comments ? transactionalSnippetBlock(parsed.comments) : "") +
          transactionalParagraph(
            `If Fit Room deserves another whirl later on, we'd be chuffed — for now tuck this mail away knowing everything's boxed up.`,
          ) +
          transactionalParagraph("Warmly,") +
          transactionalParagraph("The Fit Room team"),
      });
      await sendFitRoomPlainTextMail({
        to: user.email.trim(),
        subject: "Fit Room — subscription cancellation confirmed",
        text: clientLines.join("\n"),
        html: clientHtml,
      });
    } catch (e) {
      console.error("[stripe] cancellation retailer confirmation email failed", e);
    }
    try {
      const supportHtml = wrapFitRoomTransactionalHtml({
        documentTitle: "[Internal] Cancellation",
        preheader: `${storeLabel} · ${user.email}`,
        heading: "Retailer cancelled",
        innerHtml: transactionalSnippetBlock(supportLines.join("\n")),
      });
      await sendFitRoomPlainTextMail({
        to: SUPPORT_INBOX,
        subject: `[Fit Room] Cancellation — ${storeLabel} (${user.email})`,
        text: supportLines.join("\n"),
        html: supportHtml,
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
