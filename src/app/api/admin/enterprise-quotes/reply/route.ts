import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import { getEnterpriseQuoteById } from "@/lib/enterpriseQuoteInquiriesStore";
import { isFitRoomEmailConfigured } from "@/lib/fitRoomEmail";
import {
  appendInquiryThreadMessage,
  getInquiryThreadMessages,
  hydrateEnterpriseQuoteThread,
} from "@/lib/inquiryConversationStore";
import { sendInquiryReplyEmail } from "@/lib/inquiryReplyEmail";

export const runtime = "nodejs";

const MAX_REPLY_CHARS = 20_000;

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

function greetingFirstName(storeNameOrContact: string): string {
  const t = storeNameOrContact.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? "there";
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isFitRoomEmailConfigured()) {
    return Response.json({ error: "Email is not configured. Set RESEND_API_KEY." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const id = typeof b.id === "string" ? b.id.trim() : "";
  const replyRaw = typeof b.message === "string" ? b.message : "";

  if (!id) return Response.json({ error: "Missing submission id." }, { status: 400 });

  const message = replyRaw.trim();
  if (!message.length) return Response.json({ error: "Reply message is empty." }, { status: 400 });
  if (message.length > MAX_REPLY_CHARS) {
    return Response.json(
      { error: `Reply is too long (max ${MAX_REPLY_CHARS.toLocaleString()} characters).` },
      { status: 400 },
    );
  }

  let quote;
  try {
    quote = await getEnterpriseQuoteById(id);
  } catch (e) {
    console.error("[fit-room][admin-enterprise-quote-reply] redis read failed", e);
    return Response.json({ error: "Could not load submission." }, { status: 503 });
  }

  if (!quote) {
    return Response.json({ error: "Submission not found." }, { status: 404 });
  }

  const toEmail = quote.email.trim();
  if (!toEmail || !toEmail.includes("@")) {
    return Response.json({ error: "Submission has no valid recipient email." }, { status: 400 });
  }

  const first = greetingFirstName(quote.storeName);
  const subject = `Re: Fit Room enterprise pricing — ${quote.storeName}`;

  try {
    const { resendEmailId } = await sendInquiryReplyEmail({
      kind: "enterprise",
      inquiryId: quote.id,
      to: toEmail,
      subject,
      greetingName: first,
      message,
    });

    await appendInquiryThreadMessage("enterprise", quote.id, {
      direction: "outbound",
      authorLabel: "Fit Room",
      body: message,
      subject,
      resendEmailId: resendEmailId ?? undefined,
    });
  } catch (e) {
    console.error("[fit-room][admin-enterprise-quote-reply] sendInquiryReplyEmail failed", {
      quoteId: quote.id,
      to: toEmail,
      message: e instanceof Error ? e.message : String(e),
    });
    return Response.json(
      { error: "Could not send email. Check Resend configuration and logs." },
      { status: 502 },
    );
  }

  const thread = await getInquiryThreadMessages("enterprise", quote.id);
  const hydrated = await hydrateEnterpriseQuoteThread({ ...quote, read: quote.read });

  console.log("[fit-room][admin-enterprise-quote-reply] sent reply", {
    quoteId: quote.id,
    to: toEmail,
    storePreview: quote.storeName.slice(0, 40),
  });

  return Response.json({ ok: true, thread, quote: { ...hydrated, thread } });
}
