import {
  transactionalEscapeHtml,
  transactionalParagraph,
  transactionalSnippetBlock,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

/**
 * Plain-text install steps for the "email developer" flow. Kept in sync with the dashboard Get Code guide.
 */
export const DEVELOPER_INSTALL_SECTIONS = [
  {
    title: "Shopify",
    steps: [
      "Sign in to Shopify. On the left, click Online store, then Themes.",
      "Look for the three dots next to your current theme. Click them, then click Edit code. On the left, under Layout, open the main theme file (theme.liquid).",
      "Scroll to the very bottom of that file. Paste the widget line on a new line just above the last line or two, then click Save.",
    ],
  },
  {
    title: "WordPress",
    steps: [
      "Sign in to the WordPress dashboard.",
      'On the left, click Plugins, then Add new. Search for "Insert Headers and Footers", install it, and activate it.',
      "Click Settings, then Insert Headers and Footers. Paste the widget line in the footer / bottom box (not the top box), then save.",
    ],
  },
  {
    title: "Wix",
    steps: [
      "Sign in to Wix and open your site's Settings (site-wide settings, not only the visual page editor).",
      "Look for Custom code or similar, then add a new custom code snippet.",
      "Paste the widget line. Choose all pages (or your whole shop) and placement at the end of the page / bottom. Apply and publish the site.",
    ],
  },
  {
    title: "Squarespace",
    steps: [
      "Sign in to Squarespace. Open Settings (gear icon).",
      'Click Advanced, then open the option for adding code to the site (often called "Code injection").',
      "Paste the widget line in the footer section only (bottom of the site, not the header). Save.",
    ],
  },
  {
    title: "Other site",
    steps: [
      "Find whoever edits your website files, or open the main layout yourself if you maintain the site.",
      "Open the layout that wraps your product pages.",
      "Go to the bottom of that file. Paste the widget line on its own line just above the very end, save, and deploy so the change is live.",
    ],
  },
] as const;

export function buildDeveloperInstallEmail(params: {
  snippet: string;
  dashboardUrl: string;
  storeLabel: string;
}): { subject: string; text: string; html: string } {
  const { snippet, dashboardUrl, storeLabel } = params;
  const label = storeLabel.trim() || "This store";

  const sectionsText = DEVELOPER_INSTALL_SECTIONS.map(
    (sec) =>
      `${sec.title}\n${sec.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
  ).join("\n\n");

  const text = `Hi,

${label} wants you to add the Fit Room try-on snippet to their site. It's one paste, near the footer, and shouldn't eat your afternoon.

The line to drop in:

${snippet}

Platform cheatsheet:

${sectionsText}

If the store signs in themselves, Dashboard → Get Code always shows the freshest version: ${dashboardUrl}

Anything weird in the markup? Reply straight to this email — humans answer.

Warmly,
The Fit Room team
`;

  const h2Style =
    'margin:28px 0 14px;font-family:Georgia,"Times New Roman",serif;font-size:17px;font-weight:600;line-height:1.3;color:#C6A77D;';
  const olStyle =
    'margin:0 0 0 1.1em;padding:0;font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:#e8e8e8;';
  const liStyle = "margin-bottom:10px;";
  const sectionsHtml = DEVELOPER_INSTALL_SECTIONS.map(
    (sec) =>
      `<h2 style="${h2Style}">${transactionalEscapeHtml(sec.title)}</h2>` +
      `<ol style="${olStyle}">${sec.steps
        .map((s) => `<li style="${liStyle}">${transactionalEscapeHtml(s)}</li>`)
        .join("")}</ol>`,
  ).join("");

  const innerHtml =
    transactionalParagraph("Hi,") +
    transactionalParagraph(
      `${label} asked us to ping you — they need Fit Room's try-on snippet tucked into their layout. One line near the closing body is usually plenty.`,
    ) +
    transactionalParagraph("Paste this wherever your stack loads global footer scripts:") +
    transactionalSnippetBlock(snippet) +
    transactionalParagraph("Below is how we normally walk folks through common platforms.") +
    sectionsHtml +
    transactionalParagraph(`The retailer can revisit Dashboard → Get Code whenever they need the live line (same URL you were sent:${" "}${dashboardUrl}).`) +
    transactionalParagraph("If something in Liquid or injections complains, hit reply — we'll read the thread.") +
    transactionalParagraph("Warmly,") +
    transactionalParagraph("The Fit Room team");

  const html = wrapFitRoomTransactionalHtml({
    documentTitle: "Install Fit Room",
    preheader: "One snippet, footer placement — install guide inside.",
    heading: "You're set up with the snippet",
    innerHtml: innerHtml,
  });

  return {
    subject: "Fit Room snippet — here's how to place it",
    text,
    html,
  };
}
