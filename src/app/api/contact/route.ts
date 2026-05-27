import { Resend } from "resend";
import { resolveWebsiteFormEmailFrom, sendFitRoomMail } from "@/lib/fitRoomEmail";
import { incrementOutboundEmailSentCounters } from "@/lib/fitRoomEmailSentCounters";
import { recordContactInquiry, getContactInquiryById } from "@/lib/contactInquiriesStore";
import {
  FIT_ROOM_THREAD_HEADER,
  fitRoomThreadHeaderValue,
  seedContactInquiryThread,
} from "@/lib/inquiryConversationStore";
import {
  staffNotificationSubjectWithToken,
  staffNotificationThreadHeaders,
} from "@/lib/inquiryReplyEmail";
import {
  transactionalParagraph,
  transactionalSnippetBlock,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

const TO_EMAIL = (process.env.CONTACT_TO ?? "support@fit-room.com").trim();
const MAX_MESSAGE_CHARS = 20_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  console.log("[fit-room][contact-api] POST received", { ts: new Date().toISOString() });

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[fit-room][contact-api] RESEND_API_KEY missing — rejecting request");
    return Response.json(
      { error: "Email is not configured. Set RESEND_API_KEY for this environment." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.warn("[fit-room][contact-api] invalid JSON body");
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    console.warn("[fit-room][contact-api] body not an object");
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = isNonEmptyString(b.name) ? b.name.trim() : null;
  const emailRaw = isNonEmptyString(b.email) ? b.email.trim() : "";
  const email = EMAIL_RE.test(emailRaw) ? emailRaw : null;
  const messageRaw = isNonEmptyString(b.message) ? b.message : "";
  const message = messageRaw.trim();

  if (!name) {
    console.warn("[fit-room][contact-api] validation failed: missing name");
    return Response.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email) {
    console.warn("[fit-room][contact-api] validation failed: missing or invalid email");
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!message) {
    console.warn("[fit-room][contact-api] validation failed: missing message");
    return Response.json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json(
      { error: `Message is too long (max ${MAX_MESSAGE_CHARS.toLocaleString()} characters).` },
      { status: 400 },
    );
  }

  console.log("[fit-room][contact-api] staff mail routing resolved", {
    staffRecipientTo: TO_EMAIL,
    CONTACT_TO_envSet: Boolean(process.env.CONTACT_TO?.trim()),
  });

  console.log("[fit-room][contact-api] payload validated", {
    nameLength: name.length,
    messageLength: message.length,
  });

  /** Persist before sending mail so enquiries are not lost if Resend fails. */
  let inquiryId: string;
  try {
    inquiryId = await recordContactInquiry({ name, email, message });
    const savedInquiry = await getContactInquiryById(inquiryId);
    if (savedInquiry) await seedContactInquiryThread(savedInquiry);
    console.log("[fit-room][contact-api] Redis recordContactInquiry completed", {
      inquiryId,
      unreadIndexKey: "fit-room:contactInquiries:index",
    });
  } catch (persistErr: unknown) {
    console.error("[fit-room][contact-api] recordContactInquiry failed — aborting email send", {
      message: persistErr instanceof Error ? persistErr.message : String(persistErr),
      stack: persistErr instanceof Error ? persistErr.stack : undefined,
    });
    return Response.json(
      { error: "We could not record your inquiry. Please try again or email support@fit-room.com directly." },
      { status: 503 },
    );
  }

  const text = [`Name: ${name}`, `Email: ${email}`, "", message].join("\n");

  const firstNameBubble = name.split(/\s+/).find(Boolean);
  const preheaderSnippet =
    message.length > 120 ? `${message.slice(0, 117).trim()}…` : message;

  const staffHtml = wrapFitRoomTransactionalHtml({
    documentTitle: "Website contact",
    preheader: preheaderSnippet,
    heading: "New contact form submission",
    innerHtml:
      transactionalParagraph(
        `${name} reached out via the Fit Room contact form — reply routing already points back to ${email}.`,
      ) + transactionalSnippetBlock(text),
  });

  const from = resolveWebsiteFormEmailFrom();

  console.log("[fit-room][contact-api] sending staff notification via Resend", {
    inquiryId,
    to: TO_EMAIL,
    from,
    replyToSubscriberEmail: `${email.slice(0, 2)}…@${email.includes("@") ? email.split("@")[1] : "(invalid)"}`,
    subjectPreview: `Contact: ${name.slice(0, 24)}${name.length > 24 ? "…" : ""}`,
  });

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [TO_EMAIL],
    replyTo: email,
    subject: staffNotificationSubjectWithToken({
      kind: "contact",
      inquiryId,
      baseSubject: `Contact: ${name}`,
    }),
    text,
    html: staffHtml,
    headers: staffNotificationThreadHeaders({ kind: "contact", inquiryId }),
  });

  if (error) {
    console.error("[fit-room][contact-api] Resend rejected staff notification (submission still saved in Redis)", {
      inquiryId,
      /** Resend error objects are plain-ish; stringify for clearer Vercel logs */
      error:
        typeof error === "object" && error !== null
          ? { ...error, message: (error as { message?: unknown }).message }
          : error,
      errorSerialized: JSON.stringify(error),
    });
    return Response.json(
      {
        error:
          "We saved your inquiry but email delivery failed right now — our team may still reach you from saved details.",
        inquiryId,
      },
      { status: 502 },
    );
  }

  console.log("[fit-room][contact-api] Resend accepted staff notification", {
    inquiryId,
    resendEmailId: data?.id ?? null,
  });

  void incrementOutboundEmailSentCounters().catch((redisErr: unknown) => {
    console.error("[fit-room][contact-form] incrementOutboundEmailSentCounters failed after successful send", {
      inquiryId,
      message: redisErr instanceof Error ? redisErr.message : String(redisErr),
    });
  });

  const confirmationHeading = firstNameBubble ? `Thanks, ${firstNameBubble}` : "Thanks for writing";

  console.log("[fit-room][contact-api] queuing subscriber confirmation via sendFitRoomMail", {
    inquiryId,
    subscriberEmailMasked: `${email.slice(0, 2)}…`,
  });

  void sendFitRoomMail({
    to: email,
    subject: staffNotificationSubjectWithToken({
      kind: "contact",
      inquiryId,
      baseSubject: "We tucked your Fit Room note away",
    }),
    text: [
      `Hi ${name},`,
      "",
      "We're grateful you slid a note beneath our door — a real teammate will read yours shortly.",
      "",
      "Spam gremlins exist, so whitelist support@fit-room.com if replies feel shy.",
      "",
      "Warmly,",
      "The Fit Room team",
    ].join("\n"),
    html: wrapFitRoomTransactionalHtml({
      documentTitle: "Message received",
      preheader: "Your contact form ping landed safely.",
      heading: confirmationHeading,
      innerHtml:
        transactionalParagraph(`Hi ${name},`) +
        transactionalParagraph(
          "Your message didn't vanish — it zipped straight behind the Fit Room inbox curtain so someone thoughtful can chew on it shortly.",
        ) +
        transactionalParagraph(
          "Give us a weekday moment; if an answer feels tardy check spam buckets or poke support@fit-room.com manually and it'll still reach us.",
        ) +
        transactionalParagraph("Warmly,") +
        transactionalParagraph("The Fit Room team"),
    }),
    headers: {
      [FIT_ROOM_THREAD_HEADER]: fitRoomThreadHeaderValue("contact", inquiryId),
    },
  }).catch((confirmationErr: unknown) => {
    console.error("[fit-room][contact-form] visitor confirmation email failed", {
      inquiryId,
      message: confirmationErr instanceof Error ? confirmationErr.message : String(confirmationErr),
      toEmail: email,
    });
  });

  return Response.json({ ok: true, id: data?.id ?? null, inquiryId });
}
