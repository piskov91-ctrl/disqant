import {
  fitRoomMarketingOrigin,
  transactionalCtaHtml,
  transactionalParagraph,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

export function retailerWelcomeEmailSubject(): string {
  return "Your Fit Room account is ready";
}

export function buildRetailerWelcomeEmailContent(params: {
  storeName: string;
  dashboardUrl?: string;
}): { subject: string; text: string; html: string } {
  const storeName = params.storeName.trim() || "there";
  const dashboardUrl = (params.dashboardUrl ?? `${fitRoomMarketingOrigin()}/dashboard`).replace(/\/$/, "");

  const text = [
    `Hi ${storeName},`,
    "",
    "Your Fit Room account is ready and your Wear Me button is now active.",
    "",
    "Head to your dashboard to grab your code — it takes about 5 minutes to add to your store.",
    "",
    dashboardUrl,
    "",
    "If you need any help just reply to this email.",
    "",
    "Kind regards,",
    "The Fit Room Team",
  ].join("\n");

  const html = wrapFitRoomTransactionalHtml({
    documentTitle: "Your Fit Room account is ready",
    preheader: "Your Wear Me button is active — grab your embed code from the dashboard.",
    heading: `Hi ${storeName},`,
    innerHtml:
      transactionalParagraph(
        "Your Fit Room account is ready and your Wear Me button is now active.",
      ) +
      transactionalParagraph(
        "Head to your dashboard to grab your code — it takes about 5 minutes to add to your store.",
      ) +
      transactionalCtaHtml(dashboardUrl, "Open your dashboard") +
      transactionalParagraph("If you need any help just reply to this email.") +
      transactionalParagraph("Kind regards,") +
      transactionalParagraph("The Fit Room Team"),
  });

  return { subject: retailerWelcomeEmailSubject(), text, html };
}
