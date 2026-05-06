import { Resend } from "resend";

const DEFAULT_FROM = "Fit Room <support@fit-room.com>";

let resendSingleton: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Resend is not configured. Set RESEND_API_KEY (create a key at https://resend.com/api-keys). Verify a sending domain and use an address from that domain for FIT_ROOM_EMAIL_FROM.",
    );
  }
  resendSingleton ??= new Resend(apiKey);
  return resendSingleton;
}

/** Truncate long strings for readable server logs (HTML can be several KB). */
function previewForLog(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}… [truncated, ${content.length} chars total]`;
}

function logFitRoomMailSendFailure(
  sender: string,
  ctx: { from: string; to: string; subject: string },
  err: unknown,
) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const resendErr =
    err && typeof err === "object" && "statusCode" in err && "name" in err
      ? {
          resendErrorName: String((err as { name: string }).name),
          resendStatusCode: (err as { statusCode: number | null }).statusCode,
        }
      : {};
  console.error(`[fit-room][email-debug] ${sender} Resend send error`, {
    ...ctx,
    message,
    stack,
    ...resendErr,
    errName: err instanceof Error ? err.name : typeof err,
  });
}

/** True when Fit Room transactional email can be sent via Resend. */
export function isFitRoomSmtpConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Verified-domain `from` for Resend. Prefer `FIT_ROOM_EMAIL_FROM`; `FIT_ROOM_SMTP_FROM` is still read for migration.
 */
export function resolveFitRoomSmtpFrom(): string {
  const fromEmail =
    process.env.FIT_ROOM_EMAIL_FROM?.trim() || process.env.FIT_ROOM_SMTP_FROM?.trim();
  return fromEmail || DEFAULT_FROM;
}

export async function sendFitRoomPlainTextMail(params: { to: string; subject: string; text: string }) {
  const from = resolveFitRoomSmtpFrom();
  console.log("[fit-room][email-debug] sendFitRoomPlainTextMail payload (before Resend)", {
    from,
    to: params.to,
    subject: params.subject,
    textBody: params.text,
  });
  const resend = getResendClient();
  let loggedFailure = false;
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    if (error) {
      logFitRoomMailSendFailure(
        "sendFitRoomPlainTextMail",
        { from, to: params.to, subject: params.subject },
        error,
      );
      loggedFailure = true;
      throw new Error(error.message);
    }
    console.log("[fit-room][email-debug] sendFitRoomPlainTextMail resendAccepted", {
      to: params.to,
      subject: params.subject,
      resendEmailId: data?.id,
    });
  } catch (err: unknown) {
    if (!loggedFailure) {
      logFitRoomMailSendFailure(
        "sendFitRoomPlainTextMail",
        { from, to: params.to, subject: params.subject },
        err,
      );
    }
    throw err;
  }
}

/** Multipart alternative: clients that support HTML show the rich body; others fall back to `text`. */
export async function sendFitRoomMail(params: { to: string; subject: string; text: string; html: string }) {
  const from = resolveFitRoomSmtpFrom();
  console.log("[fit-room][email-debug] sendFitRoomMail payload (before Resend)", {
    from,
    to: params.to,
    subject: params.subject,
    textBody: params.text,
    htmlCharCount: params.html.length,
    htmlPreview: previewForLog(params.html, 1200),
  });

  const resend = getResendClient();
  let loggedFailure = false;
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    if (error) {
      logFitRoomMailSendFailure("sendFitRoomMail", { from, to: params.to, subject: params.subject }, error);
      loggedFailure = true;
      throw new Error(error.message);
    }

    console.log("[fit-room][email-debug] sendFitRoomMail resendAccepted", {
      to: params.to,
      subject: params.subject,
      resendEmailId: data?.id,
    });
  } catch (err: unknown) {
    if (!loggedFailure) {
      logFitRoomMailSendFailure("sendFitRoomMail", { from, to: params.to, subject: params.subject }, err);
    }
    throw err;
  }
}
