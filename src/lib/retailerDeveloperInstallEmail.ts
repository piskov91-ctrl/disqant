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
  const label = storeLabel.trim() || "This store";

  const sectionsText = DEVELOPER_INSTALL_SECTIONS.map(
    (sec) =>
      `${sec.title}\n${sec.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
  ).join("\n\n");

  const text = `Hi there,

${label} has invited you to install the Fit Room virtual try-on widget on their website. It takes less than five minutes and only requires pasting one line of code.

Here is the code:
${snippet}

Full installation instructions are below.

${sectionsText}

The store owner can always sign in to Fit Room and open Dashboard → Get Code to see the live snippet: ${dashboardUrl}

If you have any questions, reply to this email and we will help straight away.

Thanks,
The Fit Room Team

support@fit-room.com
`;

  const sectionsHtml = DEVELOPER_INSTALL_SECTIONS.map(
    (sec) => `
    <h2 style="margin:1.75em 0 0.6em;font-size:17px;font-weight:600;color:#1c1917;letter-spacing:-0.02em;">${escapeHtml(sec.title)}</h2>
    <ol style="margin:0 0 0 1.25em;padding:0;color:#44403c;line-height:1.65;font-size:15px;">
      ${sec.steps.map((s) => `<li style="margin-bottom:0.55em;">${escapeHtml(s)}</li>`).join("")}
    </ol>`,
  ).join("");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;font-family:Georgia,'Times New Roman',serif;background:#fafaf9;color:#292524;line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;box-shadow:0 4px 24px rgba(28,25,23,0.06);">
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 16px;font-size:16px;color:#292524;">Hi there,</p>
              <p style="margin:0 0 16px;font-size:16px;color:#44403c;">
                <strong style="color:#1c1917;">${escapeHtml(label)}</strong> has invited you to install the <strong style="color:#1c1917;">Fit Room</strong> virtual try-on widget on their website.
                It takes less than five minutes and only requires pasting one line of code.
              </p>
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1c1917;">Here is the code:</p>
              <pre style="margin:0 0 20px;background:#f5f5f4;border:1px solid #e7e5e4;border-radius:8px;padding:14px 16px;overflow:auto;font-size:13px;font-family:ui-monospace,Courier,monospace;color:#1c1917;white-space:pre-wrap;word-break:break-all;line-height:1.5;">${escapeHtml(snippet)}</pre>
              <p style="margin:0 0 8px;font-size:16px;color:#44403c;">Full installation instructions are below.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 28px;border-top:1px solid #f5f5f4;">
              <p style="margin:24px 0 4px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;">Installation by platform</p>
              ${sectionsHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 12px;font-size:14px;color:#57534e;">
                The store owner can also open their <a href="${escapeHtml(dashboardUrl)}" style="color:#a16207;text-decoration:underline;">Fit Room dashboard</a> (Get Code tab) for the live snippet anytime.
              </p>
              <p style="margin:0 0 20px;font-size:16px;color:#44403c;">
                If you have any questions, <strong>reply to this email</strong> and we will help straight away.
              </p>
              <p style="margin:0;font-size:16px;color:#292524;">Thanks,<br /><strong>The Fit Room Team</strong></p>
              <p style="margin:12px 0 0;font-size:14px;color:#78716c;">
                <a href="mailto:support@fit-room.com" style="color:#a16207;">support@fit-room.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: "Your Fit Room widget is ready to install",
    text,
    html,
  };
}
