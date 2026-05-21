/** Shared transactional email shell — Fit Room dark luxury brand. */

const DEFAULT_ORIGIN = "https://fit-room.com";

/** Public site links (Terms, Privacy, logo target). Prefer NEXT_PUBLIC_SITE_URL in production. */
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

const P =
  'margin:0 0 18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#f0f0f0;';
const muted = "#a3a3a3";

/**
 * Wrapper for all transactional mail: dark background (#1a1a1a), gold wordmark fallback,
 * gold accents, readable body, branded footer + Terms/Privacy.
 */
export function wrapFitRoomTransactionalHtml(params: {
  /** Shown as <title>; keep short. */
  documentTitle?: string;
  /** Hidden inbox preview snippet (often first line intent). Max ~90 chars ideally. */
  preheader?: string;
  /** Optional gold headline inside the card. */
  heading?: string;
  /** Already-escaped semantic HTML fragments (paragraphs, lists, HRs, CTAs). */
  innerHtml: string;
}): string {
  const origin = fitRoomMarketingOrigin();
  const termsUrl = `${origin}/terms`;
  const privacyUrl = `${origin}/privacy`;
  const title = transactionalEscapeHtml(params.documentTitle ?? "Fit Room");
  const preRaw = params.preheader?.trim() ?? "";
  const preEscaped = transactionalEscapeHtml(preRaw);
  const headingBlock = params.heading
    ? `<h1 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;line-height:1.25;color:#C6A77D;">
         ${transactionalEscapeHtml(params.heading)}
       </h1>`
    : "";

  /* Apple Mail / Gmail preheader spacer trick */
  const preSpacer =
    "&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;";

  const linkGold = "color:#C6A77D;text-decoration:underline;text-underline-offset:2px;";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta http-equiv="x-ua-compatible" content="ie=edge"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a1a;">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${preEscaped}</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#1a1a1a;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="640" style="max-width:640px;width:100%;">

        <!-- Wordmark -->
        <tr>
          <td align="center" style="padding:4px 0 20px;">
            <a href="${transactionalEscapeHtml(origin)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
              <span style="font-family:Georgia,'Times New Roman',Times,serif;font-size:26px;font-weight:600;line-height:1.2;color:#C6A77D;letter-spacing:0.02em;">Fit Room</span>
            </a>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 0 24px;">
            <div style="height:2px;line-height:2px;background:linear-gradient(90deg,rgba(198,167,125,0),#C6A77D,#C6A77D,rgba(198,167,125,0));border-radius:1px;"></div>
          </td>
        </tr>

        <!-- Main card -->
        <tr>
          <td style="padding:36px 32px 34px;background-color:#252525;border:1px solid #333333;border-radius:16px;border-top:3px solid #C6A77D;">
            ${headingBlock}
            ${params.innerHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:28px 12px 8px;font-family:system-ui,-apple-system,sans-serif;">
            <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:${muted};">
              Fit Room Ltd &nbsp;·&nbsp; London, UK &nbsp;·&nbsp;
              <a href="mailto:support@fit-room.com" style="${linkGold}">support@fit-room.com</a>
            </p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:${muted};">
              <a href="${transactionalEscapeHtml(termsUrl)}" style="${linkGold}">Terms</a>
              <span aria-hidden="true" style="color:#525252">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
              <a href="${transactionalEscapeHtml(privacyUrl)}" style="${linkGold}">Privacy</a>
            </p>
            <div style="height:12px;line-height:12px;">${preRaw ? `<span style="font-size:0">${preSpacer}</span>` : ""}</div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Styled paragraph helper for transactional inner fragments. */
export function transactionalParagraph(textPlain: string): string {
  return `<p style="${P}">${transactionalEscapeHtml(textPlain)}</p>`;
}

/** Solid gold fill CTA compatible with Gmail/Outlook quirks. */
export function transactionalCtaHtml(href: string, label: string): string {
  const eh = transactionalEscapeHtml(href);
  const el = transactionalEscapeHtml(label);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="border-radius:10px;background-color:#C6A77D;mso-padding-alt:14px 28px;">
      <a href="${eh}" style="display:inline-block;padding:14px 28px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#201a17;text-decoration:none;border-radius:10px;line-height:1.25;">${el}</a>
    </td>
  </tr>
</table>`;
}

/** Inline code / snippet strip on charcoal. */
export function transactionalSnippetBlock(snippetPlain: string): string {
  return `<pre style="margin:14px 0 22px;padding:14px 16px;background-color:#171717;border:1px solid rgba(198,167,125,0.35);border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;color:#e4e4e7;overflow:auto;white-space:pre-wrap;word-break:break-word;">${transactionalEscapeHtml(snippetPlain)}</pre>`;
}
