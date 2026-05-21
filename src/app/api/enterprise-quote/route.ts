import { Resend } from "resend";
import { recordEnterpriseQuote } from "@/lib/enterpriseQuoteInquiriesStore";
import { incrementOutboundEmailSentCounters } from "@/lib/fitRoomEmailSentCounters";
import {
  transactionalParagraph,
  transactionalSnippetBlock,
  wrapFitRoomTransactionalHtml,
} from "@/lib/fitRoomTransactionalEmailHtml";

export const runtime = "nodejs";

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

const VISITOR_SET = new Set(["under-10k", "10k-50k", "50k-100k", "100k-500k", "500k-plus"]);
const VISITOR_LABEL: Record<string, string> = {
  "under-10k": "Under 10k",
  "10k-50k": "10k – 50k",
  "50k-100k": "50k – 100k",
  "100k-500k": "100k – 500k",
  "500k-plus": "500k+",
};

const PLATFORM_SET = new Set(["shopify", "wordpress", "wix", "squarespace", "other"]);
const PLATFORM_LABEL: Record<string, string> = {
  shopify: "Shopify",
  wordpress: "WordPress",
  wix: "Wix",
  squarespace: "Squarespace",
  other: "Other",
};

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
  const apiKey = process.env.RESEND_API_KEY;
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
  const websiteUrlRaw = typeof b.websiteUrl === "string" ? b.websiteUrl : "";
  const monthlyVisitors = typeof b.monthlyVisitors === "string" ? b.monthlyVisitors : "";
  const platform = typeof b.platform === "string" ? b.platform : "";

  if (!storeName) return Response.json({ error: "Store name is required." }, { status: 400 });
  if (!VISITOR_SET.has(monthlyVisitors)) {
    return Response.json({ error: "Please select monthly website visitors." }, { status: 400 });
  }
  if (!PLATFORM_SET.has(platform)) {
    return Response.json({ error: "Please select a platform." }, { status: 400 });
  }

  let websiteUrl = "";
  try {
    const u = new URL(normalizeWebsiteInput(websiteUrlRaw));
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad");
    websiteUrl = u.toString();
  } catch {
    return Response.json({ error: "Please enter a valid website URL." }, { status: 400 });
  }

  const monthlyVisitorsLabel = VISITOR_LABEL[monthlyVisitors] ?? monthlyVisitors;
  const platformLabel = PLATFORM_LABEL[platform] ?? platform;

  let quoteId: string;
  try {
    quoteId = await recordEnterpriseQuote({
      storeName,
      websiteUrl,
      monthlyVisitors,
      monthlyVisitorsLabel,
      platform,
      platformLabel,
    });
  } catch (e) {
    console.error("[fit-room][enterprise-quote] Redis save failed", e);
    return Response.json({ error: "Could not save your request. Please try again shortly." }, { status: 503 });
  }

  const text = [
    "[Enterprise quote request]",
    "",
    `Store name: ${storeName}`,
    `Website: ${websiteUrl}`,
    `Monthly visitors: ${monthlyVisitorsLabel}`,
    `Platform: ${platformLabel}`,
    `Record id: ${quoteId}`,
  ].join("\n");

  const staffHtml = wrapFitRoomTransactionalHtml({
    documentTitle: "Enterprise quote",
    preheader: `${storeName} · ${monthlyVisitorsLabel}`,
    heading: "Enterprise quote request",
    innerHtml:
      transactionalParagraph(`Submitted from pricing — ${storeName}.`) +
      transactionalSnippetBlock(text),
  });

  let from = resolveContactFormFrom();
  if (extractBareEmail(from) === extractBareEmail(TO_EMAIL)) {
    from = CONTACT_FORM_FROM_DEFAULT;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [TO_EMAIL],
    subject: `Enterprise quote: ${storeName}`,
    text,
    html: staffHtml,
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
