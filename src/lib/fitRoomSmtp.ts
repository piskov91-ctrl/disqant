import nodemailer from "nodemailer";

const DEFAULT_FROM = "Fit Room <support@fit-room.com>";

/** Default host when `SMTP_HOST` is unset (Hostinger). */
const HOSTINGER_SMTP_HOST = "smtp.hostinger.com";

/** Truncate long strings for readable server logs (HTML can be several KB). */
function previewForLog(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}… [truncated, ${content.length} chars total]`;
}

export function isFitRoomSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASSWORD?.trim());
}

export function resolveFitRoomSmtpFrom(): string {
  const raw = process.env.FIT_ROOM_SMTP_FROM?.trim();
  return raw || DEFAULT_FROM;
}

export function createFitRoomSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim() || HOSTINGER_SMTP_HOST;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD?.trim();
  if (!user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD (optional SMTP_HOST, default smtp.hostinger.com; port 587 STARTTLS).",
    );
  }

  const portRaw = process.env.SMTP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : 587;

  const secureEnv = process.env.SMTP_SECURE?.trim();
  const secure =
    secureEnv === "1" ||
    secureEnv === "true" ||
    secureEnv?.toLowerCase() === "yes" ||
    port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: { user, pass },
  });
}

export async function sendFitRoomPlainTextMail(params: { to: string; subject: string; text: string }) {
  const from = resolveFitRoomSmtpFrom();
  const host = process.env.SMTP_HOST?.trim() || HOSTINGER_SMTP_HOST;
  const smtpUser = process.env.SMTP_USER?.trim() || "";
  const port = process.env.SMTP_PORT?.trim() ? Number(process.env.SMTP_PORT?.trim()) : 587;
  console.log("[fit-room][email-debug] sendFitRoomPlainTextMail payload (before SMTP)", {
    smtpHost: host,
    smtpPort: port,
    smtpAuthUser: smtpUser || "(unset)",
    from,
    to: params.to,
    subject: params.subject,
    textBody: params.text,
  });
  const transport = createFitRoomSmtpTransport();
  const info = await transport.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });
  console.log("[fit-room][email-debug] sendFitRoomPlainTextMail smtpAccepted", {
    to: params.to,
    subject: params.subject,
    messageId: info.messageId,
    response: info.response,
  });
}

/** Multipart alternative: clients that support HTML show the rich body; others fall back to `text`. */
export async function sendFitRoomMail(params: { to: string; subject: string; text: string; html: string }) {
  const from = resolveFitRoomSmtpFrom();
  const host = process.env.SMTP_HOST?.trim() || HOSTINGER_SMTP_HOST;
  const smtpUser = process.env.SMTP_USER?.trim() || "";
  const port = process.env.SMTP_PORT?.trim() ? Number(process.env.SMTP_PORT?.trim()) : 587;
  console.log("[fit-room][email-debug] sendFitRoomMail payload (before SMTP)", {
    smtpHost: host,
    smtpPort: port,
    smtpAuthUser: smtpUser || "(unset)",
    from,
    to: params.to,
    subject: params.subject,
    textBody: params.text,
    htmlCharCount: params.html.length,
    htmlPreview: previewForLog(params.html, 1200),
  });

  const transport = createFitRoomSmtpTransport();
  const info = await transport.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  console.log("[fit-room][email-debug] sendFitRoomMail smtpAccepted", {
    to: params.to,
    subject: params.subject,
    messageId: info.messageId,
    response: info.response,
  });
}
