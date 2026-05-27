import { isFitRoomEmailConfigured, sendFitRoomPlainTextMail } from "@/lib/fitRoomEmail";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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

function paragraphsToHtml(text: string): string {
  const parts = text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.map((p) => `<p style="margin:0 0 1em;line-height:1.5">${escHtml(p).replace(/\n/g, "<br/>")}</p>`).join("");
}

export function buildTopUpCheckoutConfirmationEmail(params: { storeDisplayName: string; tryOnsAdded: number }): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Your extra try-ons are in";
  const label = params.storeDisplayName.trim() || "there";
  const x = Math.floor(params.tryOnsAdded);
  const para =
    `Hi ${label}, Your extra try-ons are in. We have just added ${x.toLocaleString()} try-ons to your Fit Room account and they are ready to use right now. Your Wear Me button will carry on working exactly as normal — your customers will not see any difference. These try-ons stay with you until you use them up. They do not expire at the end of the month, so there is no rush. If you ever want to check your balance or top up again, you can do that any time from your dashboard.`;

  const text = [para, "", "Kind regards,", "", "The Fit Room Team"].join("\n");

  const html = `<div style="font-family:Georgia,Times New Roman,serif;font-size:16px;color:#1a1612;">${paragraphsToHtml(text)}</div>`;
  return { subject, text, html };
}

/** Three short steps each — plain language aligned with retailer dashboard guides. */
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
      'Go to Plugins → Add new → search for Insert Headers and Footers → Install and Activate it.',
      'Open Settings → Insert Headers and Footers. Paste your Wear Me line in the Footer tab (bottom of site—not the Header box), then save.',
    ],
  },
  {
    heading: "Wix",
    steps: [
      "Sign in to Wix and open your site-wide Settings.",
      'Find Custom code (or equivalent) and add a new snippet.',
      'Paste your Wear Me line. Set placement to load on every page at the footer / bottom, then Publish.',
    ],
  },
  {
    heading: "Squarespace",
    steps: [
      "Sign in to Squarespace and open Settings.",
      'Go to Advanced → Code Injection.',
      "Paste your Wear Me line into the Footer field (not Header), then save.",
    ],
  },
  {
    heading: "Custom HTML",
    steps: [
      "Open your site layout or whoever maintains your storefront templates.",
      "Edit the wrapper file that loads on your shop pages.",
      "Paste your Wear Me line near the bottom of that file above the footer, save, and deploy so it goes live.",
    ],
  },
];

export function subscriptionInstallInstructionsPlain(): string {
  const blocks = SUBSCRIPTION_INSTALL_PLATFORMS.map((b) => {
    const lines = [`${b.heading}`, ...b.steps.map((s, i) => `${i + 1}. ${s}`)];
    return lines.join("\n");
  });
  return blocks.join("\n\n");
}

function subscriptionInstallInstructionsHtml(): string {
  return SUBSCRIPTION_INSTALL_PLATFORMS.map((b) => {
    const items = b.steps.map((s) => `<li style="margin:0 0 0.35em;line-height:1.45">${escHtml(s)}</li>`).join("");
    return `<h3 style="margin:1.5em 0 0.5em;font-size:1.05em;font-weight:700;color:#1a1612">${escHtml(b.heading)}</h3><ol style="margin:0 0 0 1.1em;padding:0;line-height:1.45">${items}</ol>`;
  }).join("");
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

  const intro =
    `Hi ${label}, Your Fit Room subscription is confirmed. You are now on the ${plan} plan with ${x.toLocaleString()} try-ons included every month.`;

  const next =
    `All that is left is adding your code to your store. First, copy your unique Wear Me code from your dashboard — go to Dashboard, then click the Get Code tab and copy your code from there.`;

  const text = [
    intro,
    "",
    next,
    "",
    "Installation:",
    "",
    subscriptionInstallInstructionsPlain(),
    "",
    "If you would like a hand with the setup, just say the word — we are always happy to help.",
    "",
    "Kind regards,",
    "",
    "The Fit Room Team",
  ].join("\n");

  const htmlCore = paragraphsToHtml([intro, next, "Installation:"].join("\n\n"));

  const html =
    `<div style="font-family:Georgia,Times New Roman,serif;font-size:16px;color:#1a1612">${htmlCore}<div style="margin-top:1em">${subscriptionInstallInstructionsHtml()}</div>` +
    `<div style="margin-top:1.5em;line-height:1.5">${escHtml(
      "If you would like a hand with the setup, just say the word — we are always happy to help.",
    )}</div><p style="margin:1.5em 0 0;line-height:1.5">${escHtml("Kind regards,")}</p>` +
    `<p style="margin:0.5em 0 0;line-height:1.5">${escHtml("The Fit Room Team")}</p></div>`;

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
    await sendFitRoomPlainTextMail({ to: email, subject, text, html });
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
    await sendFitRoomPlainTextMail({ to: email, subject, text, html });
  });
}
