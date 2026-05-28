import {
  transactionalCtaHtml,
  transactionalParagraph,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

export const RETAILER_PLAN_ACTIVATION_EMAIL_SUBJECT = "Your Fit Room plan is one step away";

export function normalizeRetailerPaymentLinkUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function buildRetailerPlanActivationEmailContent(params: {
  storeName: string;
  paymentLinkUrl: string;
}): { subject: string; text: string; html: string } {
  const storeName = params.storeName.trim() || "there";
  const paymentLinkUrl = normalizeRetailerPaymentLinkUrl(params.paymentLinkUrl);
  if (!paymentLinkUrl) {
    throw new Error("A valid HTTPS Stripe payment link is required.");
  }

  const text = [
    `Hi ${storeName},`,
    "",
    "Your Fit Room account is all set up and ready to go.",
    "",
    "The only thing left is activating your plan.",
    "",
    "Click the link below to complete your payment — it takes about 2 minutes and your Wear Me button will be active straight away.",
    "",
    "Once payment is confirmed you will receive your unique code and installation guide by email.",
    "",
    paymentLinkUrl,
    "",
    "If you have any questions before signing up just reply to this email and we will get back to you personally.",
    "",
    "Kind regards,",
    "The Fit Room Team",
  ].join("\n");

  const html = wrapFitRoomTransactionalHtml({
    documentTitle: RETAILER_PLAN_ACTIVATION_EMAIL_SUBJECT,
    preheader: "Complete your payment to activate Wear Me on your store.",
    heading: `Hi ${storeName},`,
    innerHtml:
      transactionalParagraph("Your Fit Room account is all set up and ready to go.") +
      transactionalParagraph("The only thing left is activating your plan.") +
      transactionalParagraph(
        "Click the link below to complete your payment — it takes about 2 minutes and your Wear Me button will be active straight away.",
      ) +
      transactionalParagraph(
        "Once payment is confirmed you will receive your unique code and installation guide by email.",
      ) +
      transactionalCtaHtml(paymentLinkUrl, "Complete your payment") +
      transactionalParagraph(
        "If you have any questions before signing up just reply to this email and we will get back to you personally.",
      ) +
      transactionalParagraph("Kind regards,") +
      transactionalParagraph("The Fit Room Team"),
  });

  return { subject: RETAILER_PLAN_ACTIVATION_EMAIL_SUBJECT, text, html };
}

/** Plain-text preview for admin modal (before send). */
export function buildRetailerPlanActivationEmailPreviewText(params: {
  storeName: string;
  paymentLinkUrl: string;
}): { subject: string; body: string } {
  const storeName = params.storeName.trim() || "there";
  const link = normalizeRetailerPaymentLinkUrl(params.paymentLinkUrl);
  const linkLine = link ?? "[PAYMENT LINK HERE]";

  const body = [
    `Hi ${storeName},`,
    "",
    "Your Fit Room account is all set up and ready to go.",
    "",
    "The only thing left is activating your plan.",
    "",
    "Click the link below to complete your payment — it takes about 2 minutes and your Wear Me button will be active straight away.",
    "",
    "Once payment is confirmed you will receive your unique code and installation guide by email.",
    "",
    linkLine,
    "",
    "If you have any questions before signing up just reply to this email and we will get back to you personally.",
    "",
    "Kind regards,",
    "The Fit Room Team",
  ].join("\n");

  return { subject: RETAILER_PLAN_ACTIVATION_EMAIL_SUBJECT, body };
}

/** @deprecated Use {@link buildRetailerPlanActivationEmailContent}. */
export function buildRetailerWelcomeEmailContent(params: {
  storeName: string;
  paymentLinkUrl: string;
}): { subject: string; text: string; html: string } {
  return buildRetailerPlanActivationEmailContent(params);
}
