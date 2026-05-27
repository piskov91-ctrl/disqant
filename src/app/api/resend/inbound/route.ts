import { Resend } from "resend";
import {
  appendInquiryThreadMessage,
  markInquiryUnread,
  markResendInboundProcessed,
  normalizeResendEmailHeaders,
  resolveInquiryFromInboundEmail,
  stripQuotedEmailReply,
  wasResendInboundProcessed,
} from "@/lib/inquiryConversationStore";
import { getContactInquiryById } from "@/lib/contactInquiriesStore";
import { getEnterpriseQuoteById } from "@/lib/enterpriseQuoteInquiriesStore";

export const runtime = "nodejs";

const SUPPORT_INBOX = (process.env.CONTACT_TO ?? "support@fit-room.com").trim().toLowerCase();

type ResendWebhookEvent = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
  };
};

function headerRecordFromUnknown(headers: unknown): Record<string, unknown> {
  return normalizeResendEmailHeaders(headers);
}

function inboundBodyFromEmail(email: { text?: string | null; html?: string | null }): string {
  const text = typeof email.text === "string" ? email.text.trim() : "";
  if (text) return stripQuotedEmailReply(text);
  const html = typeof email.html === "string" ? email.html : "";
  if (!html) return "";
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return stripQuotedEmailReply(stripped);
}

function parseSenderLabel(from: string): string {
  const t = from.trim();
  const nameMatch = /^([^<]+)</.exec(t);
  if (nameMatch?.[1]) return nameMatch[1].trim().replace(/^"|"$/g, "");
  return t.split("@")[0] || "Client";
}

function isSupportRecipient(toList: string[] | undefined): boolean {
  if (!toList?.length) return true;
  return toList.some((addr) => {
    const lower = addr.toLowerCase();
    return lower.includes(SUPPORT_INBOX) || lower.endsWith("@fit-room.com");
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[fit-room][resend-inbound] RESEND_WEBHOOK_SECRET is not set.");
    return Response.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "RESEND_API_KEY not configured." }, { status: 500 });
  }

  const payload = await req.text();

  const resend = new Resend(apiKey);
  let event: ResendWebhookEvent;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    }) as ResendWebhookEvent;
  } catch (e) {
    console.error("[fit-room][resend-inbound] webhook verification failed", e);
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return Response.json({ received: true, ignored: event.type ?? "unknown" });
  }

  const emailId = event.data?.email_id?.trim();
  if (!emailId) {
    return Response.json({ error: "Missing email_id." }, { status: 400 });
  }

  if (await wasResendInboundProcessed(emailId)) {
    return Response.json({ received: true, duplicate: true });
  }

  if (!isSupportRecipient(event.data?.to)) {
    await markResendInboundProcessed(emailId);
    return Response.json({ received: true, ignored: "recipient" });
  }

  const receiving = await resend.emails.receiving.get(emailId);
  if (receiving.error || !receiving.data) {
    console.error("[fit-room][resend-inbound] receiving.get failed", receiving.error);
    return Response.json({ error: "Could not load inbound email." }, { status: 502 });
  }

  const email = receiving.data;
  const from = typeof email.from === "string" ? email.from : event.data?.from ?? "";
  const subject = typeof email.subject === "string" ? email.subject : event.data?.subject ?? "";
  const headers = headerRecordFromUnknown(email.headers);

  const resolved = await resolveInquiryFromInboundEmail({ from, subject, headers });

  if (!resolved) {
    console.warn("[fit-room][resend-inbound] no matching inquiry thread", {
      emailId,
      from,
      subject: subject.slice(0, 120),
    });
    await markResendInboundProcessed(emailId);
    return Response.json({ received: true, unmatched: true });
  }

  const body = inboundBodyFromEmail(email);
  if (!body) {
    await markResendInboundProcessed(emailId);
    return Response.json({ received: true, emptyBody: true });
  }

  const exists =
    resolved.kind === "contact"
      ? await getContactInquiryById(resolved.inquiryId)
      : await getEnterpriseQuoteById(resolved.inquiryId);

  if (!exists) {
    await markResendInboundProcessed(emailId);
    return Response.json({ received: true, inquiryMissing: true });
  }

  await appendInquiryThreadMessage(resolved.kind, resolved.inquiryId, {
    direction: "inbound",
    authorLabel: parseSenderLabel(from),
    body,
    subject: subject.trim() || undefined,
    resendInboundId: emailId,
  });

  await markInquiryUnread(resolved.kind, resolved.inquiryId);
  await markResendInboundProcessed(emailId);

  console.log("[fit-room][resend-inbound] stored client reply", {
    emailId,
    kind: resolved.kind,
    inquiryId: resolved.inquiryId,
  });

  return Response.json({
    received: true,
    kind: resolved.kind,
    inquiryId: resolved.inquiryId,
  });
}
