import { Resend } from "resend";
import { recordEnterpriseQuote, getEnterpriseQuoteById } from "@/lib/enterpriseQuoteInquiriesStore";
import { seedEnterpriseQuoteThread } from "@/lib/inquiryConversationStore";
import {
  staffNotificationSubjectWithToken,
  staffNotificationThreadHeaders,
} from "@/lib/inquiryReplyEmail";
import { resolveWebsiteFormEmailFrom } from "@/lib/fitRoomEmail";
import { incrementOutboundEmailSentCounters } from "@/lib/fitRoomEmailSentCounters";
import {
  transactionalParagraph,
  transactionalSnippetBlock,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

export const runtime = "nodejs";

const TO_EMAIL = (process.env.CONTACT_TO ?? "support@fit-room.com").trim();
const MAX_MESSAGE_CHARS = 20_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "Email is not configured. Set RESEND_API_KEY for this environment." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const storeName = isNonEmptyString(b.storeName) ? b.storeName.trim() : null;
  const emailRaw = isNonEmptyString(b.email) ? b.email.trim() : "";
  const email = EMAIL_RE.test(emailRaw) ? emailRaw : null;
  const messageRaw = isNonEmptyString(b.message) ? b.message : "";
  const message = messageRaw.trim();

  if (!storeName) return Response.json({ error: "Store name is required." }, { status: 400 });
  if (!email) return Response.json({ error: "A valid email address is required." }, { status: 400 });
  if (!message) return Response.json({ error: "Please tell us what you need." }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json(
      { error: `Message is too long (max ${MAX_MESSAGE_CHARS.toLocaleString()} characters).` },
      { status: 400 },
    );
  }

  let quoteId: string;
  try {
    quoteId = await recordEnterpriseQuote({
      email,
      storeName,
      message,
    });
    const savedQuote = await getEnterpriseQuoteById(quoteId);
    if (savedQuote) await seedEnterpriseQuoteThread(savedQuote);
  } catch (e) {
    console.error("[fit-room][enterprise-quote] Redis save failed", e);
    return Response.json({ error: "Could not save your request. Please try again shortly." }, { status: 503 });
  }

  const text = [
    "[Enterprise quote request]",
    "",
    `Email: ${email}`,
    `Store name: ${storeName}`,
    "",
    message,
    "",
    `Record id: ${quoteId}`,
  ].join("\n");

  const preheaderSnippet = message.length > 120 ? `${message.slice(0, 117).trim()}…` : message;

  const staffHtml = wrapFitRoomTransactionalHtml({
    documentTitle: "Enterprise quote",
    preheader: preheaderSnippet,
    heading: "Enterprise quote request",
    innerHtml:
      transactionalParagraph(
        `${storeName} submitted an enterprise quote request from pricing — reply in your mail client to reach them at ${email}.`,
      ) + transactionalSnippetBlock(text),
  });

  const from = resolveWebsiteFormEmailFrom();

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [TO_EMAIL],
    replyTo: email,
    subject: staffNotificationSubjectWithToken({
      kind: "enterprise",
      inquiryId: quoteId,
      baseSubject: `Enterprise quote: ${storeName}`,
    }),
    text,
    html: staffHtml,
    headers: staffNotificationThreadHeaders({ kind: "enterprise", inquiryId: quoteId }),
  });

  if (error) {
    console.error("[fit-room][enterprise-quote] Resend failed", error);
    return Response.json(
      { error: "Could not send notification. Please email support@fit-room.com directly." },
      { status: 502 },
    );
  }

  void incrementOutboundEmailSentCounters().catch((redisErr: unknown) => {
    console.error("[fit-room][enterprise-quote] incrementOutboundEmailSentCounters failed", redisErr);
  });

  return Response.json({
    ok: true,
    message:
      "Thanks — we will be in touch within 24 hours with a tailored quote for your store.",
  });
}
