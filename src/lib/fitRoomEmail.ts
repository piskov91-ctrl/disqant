import { Resend } from "resend";

/** Attachments for Resend — `content` is raw bytes (`Buffer`), or a **base64** string (decoded here). */
export type FitRoomEmailAttachment =
  | { filename: string; content: Buffer }
  | { filename: string; content: Uint8Array }
  | { filename: string; content: string };

/** Default sender for Fit Room transactional mail (verify fit-room.com in Resend). */
const DEFAULT_FROM = "Fit Room <support@fit-room.com>";

/** Truncate long strings for readable server logs (HTML can be several KB). */
function previewForLog(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}… [truncated, ${content.length} chars total]`;
}

function attachmentContentToBuffer(content: FitRoomEmailAttachment["content"]): Buffer {
  if (Buffer.isBuffer(content)) return content;
  if (typeof content === "string") return Buffer.from(content, "base64");
  return Buffer.from(content);
}

function normalizeFitRoomAttachments(
  list: readonly FitRoomEmailAttachment[] | undefined,
): { filename: string; content: Buffer }[] | undefined {
  if (!list?.length) return undefined;
  return list.map((a) => ({
    filename: a.filename,
    content: attachmentContentToBuffer(a.content),
  }));
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

function requireResendApiKey(): string {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Resend is not configured. Set RESEND_API_KEY. Verify fit-room.com in Resend; default sender is Fit Room <support@fit-room.com> (override with FIT_ROOM_EMAIL_FROM).",
    );
  }
  return apiKey;
}

/** True when Fit Room transactional email can be sent via Resend. */
export function isFitRoomEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Verified `from` for Resend. Optional `FIT_ROOM_EMAIL_FROM` overrides the default (Fit Room plus support@fit-room.com).
 */
export function resolveFitRoomEmailFrom(): string {
  const fromEnv = process.env.FIT_ROOM_EMAIL_FROM?.trim();
  return fromEnv || DEFAULT_FROM;
}

export async function sendFitRoomPlainTextMail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: readonly FitRoomEmailAttachment[];
}) {
  const from = resolveFitRoomEmailFrom();
  const attachmentNames = params.attachments?.map((a) => a.filename) ?? [];
  console.log("[fit-room][email-debug] sendFitRoomPlainTextMail payload (before Resend)", {
    from,
    to: params.to,
    subject: params.subject,
    textBody: params.text,
    htmlAttached: Boolean(params.html?.trim()),
    htmlCharCount: params.html?.length ?? 0,
    attachmentCount: attachmentNames.length,
    attachmentFilenames: attachmentNames,
  });
  const resend = new Resend(requireResendApiKey());
  let loggedFailure = false;
  try {
    const payload: Parameters<typeof resend.emails.send>[0] = {
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    };
    const htmlBody = params.html?.trim();
    if (htmlBody) {
      payload.html = htmlBody;
    }
    const atts = normalizeFitRoomAttachments(params.attachments);
    if (atts?.length) {
      payload.attachments = atts;
    }
    const { data, error } = await resend.emails.send(payload);
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
    void import("@/lib/fitRoomEmailSentCounters")
      .then((m) => m.incrementOutboundEmailSentCounters())
      .catch((redisErr: unknown) => {
        console.error("[fit-room][email-debug] incrementOutboundEmailSentCounters failed after successful send", {
          channel: "sendFitRoomPlainTextMail",
          to: params.to,
          subject: params.subject,
          message: redisErr instanceof Error ? redisErr.message : String(redisErr),
        });
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
export async function sendFitRoomMail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: readonly FitRoomEmailAttachment[];
}) {
  const from = resolveFitRoomEmailFrom();
  const attachmentNames = params.attachments?.map((a) => a.filename) ?? [];
  console.log("[fit-room][email-debug] sendFitRoomMail payload (before Resend)", {
    from,
    to: params.to,
    subject: params.subject,
    textBody: params.text,
    htmlCharCount: params.html.length,
    htmlPreview: previewForLog(params.html, 1200),
    attachmentCount: attachmentNames.length,
    attachmentFilenames: attachmentNames,
  });

  const resend = new Resend(requireResendApiKey());
  let loggedFailure = false;
  try {
    const payload: Parameters<typeof resend.emails.send>[0] = {
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    };
    const atts = normalizeFitRoomAttachments(params.attachments);
    if (atts?.length) {
      payload.attachments = atts;
    }
    const { data, error } = await resend.emails.send(payload);
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
    void import("@/lib/fitRoomEmailSentCounters")
      .then((m) => m.incrementOutboundEmailSentCounters())
      .catch((redisErr: unknown) => {
        console.error("[fit-room][email-debug] incrementOutboundEmailSentCounters failed after successful send", {
          channel: "sendFitRoomMail",
          to: params.to,
          subject: params.subject,
          message: redisErr instanceof Error ? redisErr.message : String(redisErr),
        });
      });
  } catch (err: unknown) {
    if (!loggedFailure) {
      logFitRoomMailSendFailure("sendFitRoomMail", { from, to: params.to, subject: params.subject }, err);
    }
    throw err;
  }
}
