/** Shared transactional email shell — Fit Room responsive brand layout. */

const DEFAULT_ORIGIN = "https://fit-room.com";

/** Public logo + asset URLs. Prefer NEXT_PUBLIC_SITE_URL in production. */
export function fitRoomMarketingOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_ORIGIN;
}

/** Attributes on user-provided anchors (safe href). */
export function transactionalEscapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Main content column: Fit Room dark panel + cream body copy. */
const BODY_BG = "#2C241F";
const BODY_TEXT = "#F5EDE4";

const P =
  `margin:0 0 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.62;color:${BODY_TEXT};`;

const mutedFooter = "#9ca3af";
const footerLinkGold = "#C6A77D";

/**
 * Responsive outer frame: dark surrounds, branded header with `/logo.png`, accent bar,
 * main column on **`#2C241F`** with cream copy **`#F5EDE4`**, centred footer.
 */
export function wrapFitRoomTransactionalHtml(params: {
  /** Shown as <title>; keep short. */
  documentTitle?: string;
  /** Hidden inbox preview snippet. */
  preheader?: string;
  /** Optional headline inside body (cream text). */
  heading?: string;
  innerHtml: string;
}): string {
  const origin = fitRoomMarketingOrigin();
  const logoUrl = `${origin}/logo.png`;
  const title = transactionalEscapeHtml(params.documentTitle ?? "Fit Room");
  const preRaw = params.preheader?.trim() ?? "";
  const preEscaped = transactionalEscapeHtml(preRaw);

  const headingBlock = params.heading
    ? `<tr>
         <td style="padding:0 0 20px;mso-padding-alt:0 0 20px 0;">
           <p style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:22px;font-weight:600;line-height:1.3;color:${BODY_TEXT};mso-line-height-rule:exactly;">
             ${transactionalEscapeHtml(params.heading)}
           </p>
         </td>
       </tr>`
    : "";

  const preSpacer =
    "&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta http-equiv="x-ua-compatible" content="ie=edge"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark light"/>
<meta name="supported-color-schemes" content="dark light"/>
<title>${title}</title>
<style type="text/css">
  html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  img { border: 0; outline: none; text-decoration: none; height: auto; line-height: 100%; vertical-align: bottom; display: inline-block; -ms-interpolation-mode: bicubic; }
  table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  a { color: inherit; text-decoration: none; font-weight: 600; }
  @media screen and (max-width: 620px) {
    .fr-email-wrap-pad { padding-left: 10px !important; padding-right: 10px !important; padding-top: 14px !important; padding-bottom: 18px !important; }
    .fr-email-body-inner { padding: 28px 20px !important; }
    .fr-header-cell { padding: 18px 16px !important; }
    .fr-shell { width: 100% !important; max-width: 100% !important; }
    .fr-logo-img { width: auto !important; max-width: 72% !important; max-height: 48px !important; height: auto !important; min-width: 120px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#1a1a1a;color:#fafafa;-webkit-font-smoothing:antialiased;">
<div style="display:none;overflow:hidden;line-height:1px;max-height:0;max-width:0;opacity:0;mso-hide:all">${preEscaped}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;background-color:#1a1a1a;">
  <tr>
    <td align="center" class="fr-email-wrap-pad" style="padding:24px 14px;background-color:#1a1a1a;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" class="fr-shell" style="max-width:600px;width:100%;border-radius:14px 14px 10px 10px;overflow:hidden;background-color:${BODY_BG};">

        <tr>
          <td bgcolor="#2C241F" valign="middle" align="center" class="fr-header-cell" width="600" style="width:600px;background-color:#2C241F;padding:22px 20px 24px;line-height:normal;text-align:center;vertical-align:middle;mso-padding-alt:22px 20px 24px;font-size:16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
              <tr>
                <td align="center" style="padding:0;line-height:normal;">
                  <img
                    src="${transactionalEscapeHtml(logoUrl)}"
                    alt="Fit Room"
                    width="168"
                    class="fr-logo-img"
                    style="display:block;height:auto;max-height:54px;width:168px;max-width:88%;margin:0 auto;color:#C6A77D;"
                  />
                  <p style="margin:10px 0 0;line-height:1.35;color:#C6A77D;font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:600;display:block;mso-hide:all;mso-margin-top-alt:10px;" class="fr-wordmark-alt">
                    Fit Room
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td bgcolor="#111827" valign="middle" align="center" height="10" width="600" style="width:600px;background-color:#111827;padding:0;height:10px;line-height:10px;font-size:10px;mso-height-source:exactly;border-bottom:3px solid #C6A77D;"></td>
        </tr>

        <tr>
          <td bgcolor="${BODY_BG}" style="padding:36px 32px 38px;background-color:${BODY_BG};border-left:1px solid rgba(198,167,125,0.22);border-right:1px solid rgba(198,167,125,0.22);mso-padding-alt:36px 32px 38px;" class="fr-email-body-inner">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;">
              ${headingBlock}
              <tr>
                <td style="padding:0;font-family:system-ui,-apple-system,sans-serif;color:${BODY_TEXT};mso-padding-alt:0;">
                  ${params.innerHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" style="width:100%;max-width:600px;">
        <tr>
          <td align="center" style="padding:22px 10px 8px;mso-padding-alt:22px 10px 8px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.65;color:${mutedFooter};">
            <p style="margin:0;line-height:1.65;mso-margin-top-alt:0;mso-margin-bottom-alt:8px;color:${mutedFooter};">
              Fit Room Ltd &nbsp;|&nbsp; London, UK &nbsp;|&nbsp;
              <a href="mailto:support@fit-room.com" style="color:${footerLinkGold};text-decoration:none;font-weight:600;mso-padding-alt:0;">support@fit-room.com</a>
            </p>
            ${preRaw ? `<div style="height:8px;line-height:8px;font-size:8px;mso-hide:all;"><span style="font-size:0;line-height:0;mso-hide:all;">${preSpacer}</span></div>` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Styled paragraph for dark brand content column. */
export function transactionalParagraph(textPlain: string): string {
  return `<p style="${P}">${transactionalEscapeHtml(textPlain)}</p>`;
}

/**
 * Multiple paragraphs separated by blank lines (admin/customer letters); single newlines become `<br />`.
 */
export function transactionalFormattedLetterBody(bodyPlain: string): string {
  const trimmed = bodyPlain.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((chunk) => {
      const inner = transactionalEscapeHtml(chunk.trim()).replace(/\n/g, "<br />\n");
      return `<p style="${P}">${inner}</p>`;
    })
    .join("");
}

/** Gold fill CTA. */
export function transactionalCtaHtml(href: string, label: string): string {
  const eh = transactionalEscapeHtml(href);
  const el = transactionalEscapeHtml(label);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:10px auto 26px;mso-margin-top-alt:10px;mso-margin-bottom-alt:26px;">
  <tr>
    <td align="left" bgcolor="#C6A77D" style="border-radius:10px;background-color:#C6A77D;mso-padding-alt:14px 28px;">
      <a href="${eh}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:700;color:#1c1510;text-decoration:none;border-radius:10px;line-height:1.25;mso-line-height-rule:exactly;">${el}</a>
    </td>
  </tr>
</table>`;
}

/** Code / snippet strip on darker inset panel. */
export function transactionalSnippetBlock(snippetPlain: string): string {
  return `<pre style="margin:14px 0 22px;padding:14px 16px;background-color:#1a1715;border:1px solid rgba(198,167,125,0.4);border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;color:#F5EDE4;overflow:auto;white-space:pre-wrap;word-break:break-word;mso-margin-top-alt:14px;mso-margin-bottom-alt:22px;">${transactionalEscapeHtml(snippetPlain)}</pre>`;
}
