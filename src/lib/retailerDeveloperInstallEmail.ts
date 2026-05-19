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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDeveloperInstallEmail(params: {
  snippet: string;
  dashboardUrl: string;
  storeLabel: string;
}): { subject: string; text: string; html: string } {
  const { snippet, dashboardUrl, storeLabel } = params;
  const label = storeLabel.trim() || "your store";

  const sectionsText = DEVELOPER_INSTALL_SECTIONS.map(
    (sec) =>
      `${sec.title.toUpperCase()}\n${sec.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
  ).join("\n\n");

  const text = `Hello,

This message was sent from the Fit Room retailer dashboard for ${label}.

WIDGET SNIPPET (paste once on the site; keep the full line intact):
${snippet}

Install steps by platform (choose the one that matches the site):

${sectionsText}

The store owner can also sign in to Fit Room and open Dashboard → Get Code for the live snippet and animation.

Dashboard link: ${dashboardUrl}

If you did not expect this email, you can ignore it.

— Fit Room
support@fit-room.com
`;

  const sectionsHtml = DEVELOPER_INSTALL_SECTIONS.map(
    (sec) => `
    <h2 style="margin:1.25em 0 0.5em;font-size:16px;color:#fafafa;">${escapeHtml(sec.title)}</h2>
    <ol style="margin:0 0 0 1.25em;padding:0;color:#d4d4d8;line-height:1.5;">
      ${sec.steps.map((s) => `<li style="margin-bottom:0.5em;">${escapeHtml(s)}</li>`).join("")}
    </ol>`,
  ).join("");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#e4e4e7;padding:24px;line-height:1.5;">
  <p style="color:#a1a1aa;">Hello,</p>
  <p style="color:#e4e4e7;">This message was sent from the <strong>Fit Room</strong> retailer dashboard for <strong>${escapeHtml(label)}</strong>.</p>

  <h2 style="margin:1.5em 0 0.5em;font-size:16px;color:#fafafa;">Widget snippet</h2>
  <p style="color:#a1a1aa;font-size:14px;">Paste this once on the site (full line, unchanged):</p>
  <pre style="background:#18181b;border:1px solid #27272a;border-radius:8px;padding:14px;overflow:auto;font-size:13px;color:#f4f4f5;white-space:pre-wrap;word-break:break-all;">${escapeHtml(snippet)}</pre>

  <h2 style="margin:1.5em 0 0.5em;font-size:16px;color:#fafafa;">Install steps by platform</h2>
  <p style="color:#a1a1aa;font-size:14px;">Pick the section that matches how the site is built.</p>
  ${sectionsHtml}

  <p style="margin-top:1.5em;color:#a1a1aa;font-size:14px;">The store owner can also sign in to Fit Room and open <strong>Dashboard → Get Code</strong> for the live snippet.</p>
  <p style="margin-top:0.75em;"><a href="${escapeHtml(dashboardUrl)}" style="color:#c6a77d;">Open dashboard</a></p>

  <p style="margin-top:1.5em;color:#71717a;font-size:13px;">If you did not expect this email, you can ignore it.</p>
  <p style="color:#71717a;font-size:13px;">— Fit Room · <a href="mailto:support@fit-room.com" style="color:#a1a1aa;">support@fit-room.com</a></p>
</body>
</html>`;

  return {
    subject: `Fit Room Wear Me — embed code & install steps (${label})`,
    text,
    html,
  };
}
