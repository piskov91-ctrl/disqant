import { isFitRoomEmailConfigured, sendFitRoomMail } from "@/lib/fitRoomEmail";
import {
  transactionalEscapeHtml,
  transactionalParagraph,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

/** Greeting label: prefers store name, then company, then fallback. */
export function retailerStoreGreetingLabel(params: {
  storeName?: string | null;
  companyName?: string | null;
}): string {
  const s = params.storeName?.trim() || "";
  if (s) return s;
  const c = params.companyName?.trim() || "";
  if (c) return c;
  return "there";
}

function transactionalGoldPlatformTitle(titlePlain: string): string {
  return `<p style="margin:26px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;line-height:1.35;color:#C6A77D;mso-line-height-rule:exactly;mso-margin-top-alt:26px;mso-margin-bottom-alt:10px;">
  ${transactionalEscapeHtml(titlePlain)}
</p>`;
}

/** Numbered steps on dark body — gold-adjacent list markers via padding. */
function transactionalNumberedSteps(steps: readonly string[]): string {
  const items = steps
    .map(
      (s) =>
        `<li style="margin:0 0 12px;line-height:1.62;color:#F5EDE4;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;mso-line-height-rule:exactly;mso-margin-bottom-alt:12px;">
  ${transactionalEscapeHtml(s)}
</li>`,
    )
    .join("");
  return `<ol style="margin:0 0 22px;padding:0 0 0 22px;mso-margin-bottom-alt:22px;color:#F5EDE4;list-style-position:outside;">${items}</ol>`;
}

export function buildTopUpCheckoutConfirmationEmail(params: { storeDisplayName: string; tryOnsAdded: number }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Your extra try-ons are in";
  const label = params.storeDisplayName.trim() || "there";
  const x = Math.floor(params.tryOnsAdded);

  const main =
    `Hi ${label}, Your extra try-ons are in. We have just added ${x.toLocaleString()} try-ons to your Fit Room account and they are ready to use right now. Your Wear Me button will carry on working exactly as normal — your customers will not see any difference. These try-ons stay with you until you use them up. They do not expire at the end of the month, so there is no rush. If you ever want to check your balance or top up again, you can do that any time from your dashboard.`;

  const text = [main, "", "Kind regards,", "", "The Fit Room Team"].join("\n");

  const innerHtml =
    transactionalParagraph(main) +
    transactionalParagraph("Kind regards,") +
    transactionalParagraph("The Fit Room Team");

  const html = wrapFitRoomTransactionalHtml({
    documentTitle: subject,
    preheader: `We added ${x.toLocaleString()} try-ons — they are ready to use now.`,
    heading: subject,
    innerHtml,
  });

  return { subject, text, html };
}

/** Three short steps each — aligned with retailer dashboard guides. */
const SUBSCRIPTION_INSTALL_PLATFORMS: { heading: string; steps: readonly [string, string, string] }[] = [
  {
    heading: "Shopify",
    steps: [
      "Sign in to Shopify and open Online store → Themes.",
      "Use the three-dots menu next to your current theme → Edit code. Under Layout, open theme.liquid.",
      "Scroll to the very bottom of the file, paste your Wear Me line above the closing lines, then click Save.",
    ],
  },
  {
    heading: "WordPress",
    steps: [
      "Sign in to your WordPress dashboard.",
      "Go to Plugins → Add new → search for Insert Headers and Footers → install and activate it.",
      "Open Settings → Insert Headers and Footers, paste your Wear Me line in the Footer box (not the Header), then save.",
    ],
  },
  {
    heading: "Wix",
    steps: [
      "Sign in to Wix and open your site-wide Settings.",
      "Find Custom code (or equivalent) and add a new snippet.",
      "Paste your Wear Me line. Set placement to load on every page at the footer or bottom of the page, then Publish.",
    ],
  },
  {
    heading: "Squarespace",
    steps: [
      "Sign in to Squarespace and open Settings.",
      "Go to Advanced → Code Injection.",
      "Paste your Wear Me line into the Footer field (not Header), then save.",
    ],
  },
  {
    heading: "Custom HTML",
    steps: [
      "Open your site layout, or whoever maintains your storefront templates.",
      "Edit the wrapper file that loads on your shop pages.",
      "Paste your Wear Me line near the bottom of that file above the footer, save, and deploy so it goes live.",
    ],
  },
];

export function subscriptionInstallInstructionsPlain(): string {
  const blocks = SUBSCRIPTION_INSTALL_PLATFORMS.map((b) => {
    const lines = [b.heading, ...b.steps.map((s, i) => `${i + 1}. ${s}`)];
    return lines.join("\n");
  });
  return blocks.join("\n\n");
}

function subscriptionInstallInstructionsHtmlInner(): string {
  return SUBSCRIPTION_INSTALL_PLATFORMS.map((b) => transactionalGoldPlatformTitle(b.heading) + transactionalNumberedSteps(b.steps)).join("");
}

export function buildSubscriptionCheckoutConfirmationEmail(params: {
  storeDisplayName: string;
  planDisplayName: string;
  monthlyTryOns: number;
}): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Your Fit Room subscription is confirmed";
  const label = params.storeDisplayName.trim() || "there";
  const plan = params.planDisplayName.trim() || "your";
  const x = Math.floor(params.monthlyTryOns);

  const para1 =
    `Hi ${label}, Your Fit Room subscription is confirmed. You are now on the ${plan} plan with ${x.toLocaleString()} try-ons included every month.`;
  const para2 =
    "All that is left is adding your code to your store — it is in your dashboard under Get Code and the whole thing takes about five minutes.";
  const para3 =
    "We have also included a step-by-step installation guide below for your platform — just follow along and you will be up and running in no time.";
  const para4 =
    "If you would like a hand with the setup, just say the word — we are always happy to help.";

  const installPlain = subscriptionInstallInstructionsPlain();

  const text = [
    para1,
    "",
    para2,
    "",
    para3,
    "",
    "Installation:",
    "",
    installPlain,
    "",
    para4,
    "",
    "Kind regards,",
    "",
    "The Fit Room Team",
  ].join("\n");

  const innerHtml =
    transactionalParagraph(para1) +
    transactionalParagraph(para2) +
    transactionalParagraph(para3) +
    `<p style="margin:28px 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:600;line-height:1.4;color:#C6A77D;mso-line-height-rule:exactly;mso-margin-top-alt:28px;mso-margin-bottom-alt:14px;">
  Installation
</p>` +
    subscriptionInstallInstructionsHtmlInner() +
    transactionalParagraph(para4) +
    transactionalParagraph("Kind regards,") +
    transactionalParagraph("The Fit Room Team");

  const html = wrapFitRoomTransactionalHtml({
    documentTitle: subject,
    preheader: `${plan} plan confirmed — paste your Wear Me code in about five minutes.`,
    heading: subject,
    innerHtml,
  });

  return { subject, text, html };
}

export async function safeSendStripeCheckoutTransactionalEmail(send: () => Promise<void>): Promise<void> {
  if (!isFitRoomEmailConfigured()) return;
  try {
    await send();
  } catch (e) {
    console.error("[fit-room][stripe-checkout-email] transactional email failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Fire-and-forget top-up retailer confirmation email (Stripe checkout.payment). */
export function queueRetailerTopUpConfirmationEmail(to: string, storeDisplayName: string, tryOnsAdded: number): void {
  const email = to.trim().toLowerCase();
  if (!email) return;

  void safeSendStripeCheckoutTransactionalEmail(async () => {
    const { subject, text, html } = buildTopUpCheckoutConfirmationEmail({ storeDisplayName, tryOnsAdded });
    await sendFitRoomMail({ to: email, subject, text, html });
  });
}

/** Fire-and-forget subscription retailer confirmation email (Stripe checkout.subscription). */
export function queueRetailerSubscriptionConfirmationEmail(
  to: string,
  storeDisplayName: string,
  planDisplayName: string,
  monthlyTryOns: number,
): void {
  const email = to.trim().toLowerCase();
  if (!email) return;

  void safeSendStripeCheckoutTransactionalEmail(async () => {
    const { subject, text, html } = buildSubscriptionCheckoutConfirmationEmail({
      storeDisplayName,
      planDisplayName,
      monthlyTryOns,
    });
    await sendFitRoomMail({ to: email, subject, text, html });
  });
}
