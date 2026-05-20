import { Resend } from "resend";
import { incrementOutboundEmailSentCounters } from "@/lib/fitRoomEmailSentCounters";
import { recordPendingSubscriptionsFeedback } from "@/lib/subscriptionsFeedbackStore";

const TO_EMAIL = (process.env.CONTACT_TO ?? "support@fit-room.com").trim();
const CONTACT_FORM_FROM_DEFAULT = "Fit Room <website@fit-room.com>";

function extractBareEmail(fromHeaderStyle: string): string {
  const t = fromHeaderStyle.trim();
  const m = t.match(/<([^>]+)>/);
  return (m ? m[1] : t).trim().toLowerCase();
}

function resolveContactFormFrom(): string {
  const explicit = process.env.CONTACT_FORM_FROM?.trim();
  if (explicit) return explicit;
  const fallback = CONTACT_FORM_FROM_DEFAULT;
  if (extractBareEmail(fallback) === extractBareEmail(TO_EMAIL)) {
    return "Fit Room <noreply@fit-room.com>";
  }
  return fallback;
}

function starLabel(n: number): string {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MAX_MESSAGE = 6000;
const MIN_STORE_LEN = 2;
const MAX_STORE_LEN = 200;

export async function POST(req: Request) {
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

  const storeNameRaw = typeof b.storeName === "string" ? b.storeName.trim() : "";
  if (storeNameRaw.length < MIN_STORE_LEN) {
    return Response.json({ error: "Please enter your store name." }, { status: 400 });
  }
  if (storeNameRaw.length > MAX_STORE_LEN) {
    return Response.json({ error: `Store name must be ${MAX_STORE_LEN} characters or fewer.` }, { status: 400 });
  }

  const ratingRaw = b.rating;
  const rating = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Please choose a star rating from 1 to 5." }, { status: 400 });
  }

  const messageRaw = typeof b.message === "string" ? b.message.trim() : "";
  if (!messageRaw.length) {
    return Response.json({ error: "Please tell us about your experience." }, { status: 400 });
  }
  if (messageRaw.length > MAX_MESSAGE) {
    return Response.json({ error: `Keep your feedback under ${MAX_MESSAGE} characters.` }, { status: 400 });
  }

  let redisId: string;
  try {
    redisId = await recordPendingSubscriptionsFeedback({
      storeName: storeNameRaw,
      rating,
      message: messageRaw,
    });
  } catch (storeErr: unknown) {
    console.error("[fit-room][subscriptions-feedback] Redis record failed", {
      message: storeErr instanceof Error ? storeErr.message : String(storeErr),
    });
    return Response.json({ error: "Could not save your feedback. Please try again shortly." }, { status: 503 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[fit-room][subscriptions-feedback] RESEND_API_KEY missing; queued without email notify.");
    return Response.json({
      ok: true,
      redisId,
      emailSent: false,
    });
  }

  let from = resolveContactFormFrom();
  if (extractBareEmail(from) === extractBareEmail(TO_EMAIL)) {
    from = CONTACT_FORM_FROM_DEFAULT;
  }

  const stars = starLabel(rating);
  const text = [
    `Subscriptions page feedback`,
    `Store: ${storeNameRaw}`,
    `Queue id (Redis): ${redisId}`,
    `Rating (${rating}/5): ${stars}`,
    "",
    messageRaw,
  ].join("\n");

  const html = `
  <h2>Subscriptions — pending customer feedback</h2>
  <p><strong>Store</strong> ${escapeHtml(storeNameRaw)}</p>
  <p><strong>Internal id</strong> <span style="font-family:monospace;">${escapeHtml(redisId)}</span></p>
  <p><strong>Rating</strong> ${rating} / 5 — ${escapeHtml(stars)}</p>
  <p><strong>Experience</strong></p>
  <pre style="font-family:system-ui,Segoe UI,sans-serif;white-space:pre-wrap;">${escapeHtml(messageRaw)}</pre>
  <p style="margin-top:1rem;font-size:12px;color:#555;">Approve or reject in Admin → Reviews.</p>
  `;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [TO_EMAIL],
    subject: `Pending review (${storeNameRaw}): ${stars} (${rating}/5)`,
    text,
    html,
  });

  if (error) {
    console.error("[fit-room][subscriptions-feedback] Resend error after Redis save — entry remains pending:", error);
    return Response.json({
      ok: true,
      redisId,
      emailSent: false,
      emailWarning: true,
      emailId: null,
    });
  }

  void incrementOutboundEmailSentCounters().catch((redisErr: unknown) => {
    console.error("[fit-room][subscriptions-feedback] incrementOutboundEmailSentCounters failed after send", {
      message: redisErr instanceof Error ? redisErr.message : String(redisErr),
    });
  });

  return Response.json({ ok: true, emailSent: true, emailId: data?.id ?? null, redisId });
}
