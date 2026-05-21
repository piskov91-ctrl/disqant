import { Resend } from "resend";
import { resolveWebsiteFormEmailFrom, sendFitRoomMail } from "@/lib/fitRoomEmail";
import { incrementOutboundEmailSentCounters } from "@/lib/fitRoomEmailSentCounters";
import { recordContactInquiry } from "@/lib/contactInquiriesStore";
import {
  transactionalParagraph,
  transactionalSnippetBlock,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

const TO_EMAIL = (process.env.CONTACT_TO ?? "support@fit-room.com").trim();

const VISITOR_OPTIONS = new Set(["under-10k", "10k-50k", "50k-100k", "100k-plus"]);

const VISITOR_LABEL: Record<string, string> = {
  "under-10k": "Under 10k",
  "10k-50k": "10k – 50k",
  "50k-100k": "50k – 100k",
  "100k-plus": "100k+",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeWebsiteInput(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
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
  const company = isNonEmptyString(b.company) ? b.company.trim() : null;
  const message = isNonEmptyString(b.message) ? b.message.trim() : null;
  const websiteUrlRaw = typeof b.websiteUrl === "string" ? b.websiteUrl : "";
  const monthlyVisitors = typeof b.monthlyVisitors === "string" ? b.monthlyVisitors : "";

  if (!name) {
    console.warn("[fit-room][contact-api] validation failed: missing name");
    return Response.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email) {
    console.warn("[fit-room][contact-api] validation failed: missing or invalid email");
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!company) {
    console.warn("[fit-room][contact-api] validation failed: missing company/store");
    return Response.json({ error: "Store name is required." }, { status: 400 });
  }
  if (!message) {
    console.warn("[fit-room][contact-api] validation failed: missing message");
    return Response.json({ error: "Message is required." }, { status: 400 });
  }
  if (!VISITOR_OPTIONS.has(monthlyVisitors)) {
    console.warn("[fit-room][contact-api] validation failed: monthlyVisitors", { monthlyVisitorsRaw: monthlyVisitors });
    return Response.json({ error: "Please select monthly visitors." }, { status: 400 });
  }

  let websiteLine = "—";
  if (websiteUrlRaw.trim()) {
    try {
      const u = new URL(normalizeWebsiteInput(websiteUrlRaw));
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad");
      websiteLine = u.toString();
    } catch {
      console.warn("[fit-room][contact-api] validation failed: invalid website URL", {
        trimmedLength: websiteUrlRaw.trim().length,
      });
      return Response.json({ error: "Please enter a valid website URL, or leave it empty." }, { status: 400 });
    }
  }

  console.log("[fit-room][contact-api] staff mail routing resolved", {
    staffRecipientTo: TO_EMAIL,
    CONTACT_TO_envSet: Boolean(process.env.CONTACT_TO?.trim()),
  });

  console.log("[fit-room][contact-api] payload validated", {
    monthlyVisitorsBucket: monthlyVisitors,
    visitorLabel: VISITOR_LABEL[monthlyVisitors] ?? monthlyVisitors,
    nameLength: name.length,
    companyLength: company.length,
    messageLength: message.length,
    hasWebsiteUrl: Boolean(websiteUrlRaw.trim()),
  });

  const visitorsLabel = VISITOR_LABEL[monthlyVisitors] ?? monthlyVisitors;

  /** Persist before sending mail so enquiries are not lost if Resend fails. */
  let inquiryId: string;
  try {
    inquiryId = await recordContactInquiry({
      name,
      email,
      company,
      websiteDisplay: websiteLine,
      monthlyVisitors,
      monthlyVisitorsLabel: visitorsLabel,
      message,
    });
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

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Store name: ${company}`,
    `Website: ${websiteLine}`,
    `Monthly visitors: ${visitorsLabel}`,
    "",
    message,
  ].join("\n");

  const firstNameBubble = name.split(/\s+/).find(Boolean);
  const preheaderSnippet =
    message.length > 120 ? `${message.slice(0, 117).trim()}…` : message;

  const staffHtml = wrapFitRoomTransactionalHtml({
    documentTitle: "Website contact",
    preheader: preheaderSnippet,
    heading: "New contact form submission",
    innerHtml:
      transactionalParagraph(
        `${name} from ${company} reached out via the Fit Room contact form — reply routing already points back to ${email}.`,
      ) + transactionalSnippetBlock(text),
  });

  const from = resolveWebsiteFormEmailFrom();

  console.log("[fit-room][contact-api] sending staff notification via Resend", {
    inquiryId,
    to: TO_EMAIL,
    from,
    replyToSubscriberEmail: `${email.slice(0, 2)}…@${email.includes("@") ? email.split("@")[1] : "(invalid)"}`,
    subjectPreview: `Contact: ${name.slice(0, 24)}${name.length > 24 ? "…" : ""} — ${company.slice(0, 24)}${company.length > 24 ? "…" : ""}`,
  });

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [TO_EMAIL],
    replyTo: email,
    subject: `Contact: ${name} — ${company}`,
    text,
    html: staffHtml,
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
    subject: "We tucked your Fit Room note away",
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
  }).catch((confirmationErr: unknown) => {
    console.error("[fit-room][contact-form] visitor confirmation email failed", {
      inquiryId,
      message: confirmationErr instanceof Error ? confirmationErr.message : String(confirmationErr),
      toEmail: email,
    });
  });

  return Response.json({ ok: true, id: data?.id ?? null, inquiryId });
}
